#!/usr/bin/env node
/**
 * Garde sécurité Kidmapp — analyse UNIQUEMENT les lignes ajoutées par la PR.
 *
 *   node scripts/security-guard.mjs [--base origin/main]
 *
 * Sort en code 1 si une erreur est trouvée. Les avertissements n'échouent pas le build.
 * Ne juge jamais la dette existante : seul ce que la PR ajoute est examiné.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const base = (() => {
  const i = process.argv.indexOf('--base');
  return i !== -1 ? process.argv[i + 1] : 'origin/main';
})();

const CI = !!process.env.GITHUB_ACTIONS;
const errors = [];
const warnings = [];

const err = (file, line, msg) => errors.push({ file, line, msg });
const warn = (file, line, msg) => warnings.push({ file, line, msg });

const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let mergeBase;
try {
  mergeBase = git(`merge-base ${base} HEAD`).trim();
} catch {
  console.error(`⚠️  Impossible de résoudre la base "${base}" — garde ignorée.`);
  process.exit(0);
}

const changed = git(`diff --name-only --diff-filter=ACMR ${mergeBase}..HEAD`)
  .split('\n')
  .filter(Boolean);
const addedFiles = git(`diff --name-only --diff-filter=A ${mergeBase}..HEAD`)
  .split('\n')
  .filter(Boolean);

if (changed.length === 0) {
  console.log('Aucun fichier modifié — rien à vérifier.');
  process.exit(0);
}

/** Fichiers dont le contenu est généré ou binaire : hors périmètre du scan de secrets. */
const SCAN_SKIP = /(^|\/)(security-guard\.mjs|eslint-ratchet\.mjs|secret-scan\.py|package-lock\.json|bun\.lock|bun\.lockb|pubspec\.lock|dist\/|node_modules\/|\.eslint-baseline\.json$)/;

/** Lignes ajoutées par la PR, par fichier, avec leur numéro de ligne réel. */
function addedLines(file) {
  let diff;
  try {
    diff = git(`diff -U0 ${mergeBase}..HEAD -- "${file}"`);
  } catch {
    return [];
  }
  const out = [];
  let lineNo = 0;
  for (const raw of diff.split('\n')) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNo = parseInt(hunk[1], 10);
      continue;
    }
    if (raw.startsWith('+++') || raw.startsWith('---')) continue;
    if (raw.startsWith('+')) out.push({ n: lineNo++, text: raw.slice(1) });
  }
  return out;
}

// ---------------------------------------------------------------- 1. Secrets en dur
const SECRET_PATTERNS = [
  [/\bsb_secret_[A-Za-z0-9_-]{16,}/, 'clé secrète Supabase (sb_secret_…)'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'clé secrète style OpenAI/Anthropic (sk-…)'],
  [/\bre_[A-Za-z0-9]{20,}/, 'clé API Resend (re_…)'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clé privée'],
  [/\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}/, 'token GitHub'],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, 'token GitHub (PAT fin)'],
  [/\bAIza[0-9A-Za-z_-]{30,}/, 'clé API Google'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'token Slack'],
  [
    /(service_?role|service_?key|api_?key|apikey|secret|password|passwd|token|auth_?key)[A-Za-z_]*\s*[:=]\s*["'][^"'$\s{][^\s"']{14,}["']/i,
    "secret assigné en littéral (utiliser une variable d'environnement)",
  ],
];

const JWT_RE = /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}/;

/**
 * Rôles de JWT Supabase publics par design : la clé anon/publishable est servie au
 * navigateur de toute façon, l'écrire en clair n'est pas une fuite. Seule la
 * service_role est critique — d'où un jugement sur la claim, pas sur l'allure du token.
 */
const PUBLIC_JWT_ROLES = new Set(['anon', 'publishable']);

const jwtRole = (token) => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
};

/** Faux positifs connus : placeholders, exemples et lectures d'env légitimes. */
const SECRET_ALLOW = /(process\.env|Deno\.env|import\.meta\.env|<[A-Z_]+>|xxx|XXX|placeholder|example|EXEMPLE|your[-_]|dummy|\.\.\.)/i;

for (const file of changed) {
  if (SCAN_SKIP.test(file)) continue;
  for (const { n, text } of addedLines(file)) {
    if (SECRET_ALLOW.test(text)) continue;

    const jwt = text.match(JWT_RE);
    if (jwt) {
      const role = jwtRole(jwt[0]);
      if (PUBLIC_JWT_ROLES.has(role)) {
        warn(file, n, `JWT Supabase en dur avec role=${role} : publique par design, donc acceptable. Préférer tout de même import.meta.env, et vérifier qu'il s'agit bien du projet attendu.`);
      } else {
        err(file, n, `JWT en dur avec role=${role ?? 'illisible'} : hors anon/publishable, une clé Supabase ne doit jamais être écrite dans le code. Révoquer la clé si elle a été poussée.`);
      }
      continue;
    }

    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(text)) {
        err(file, n, `Secret potentiel : ${label}. Passer par une variable d'environnement / un secret Supabase, et révoquer la valeur si elle a été poussée.`);
        break;
      }
    }
  }
}

// ------------------------------------------- 2. service_role hors des edge functions
for (const file of changed) {
  if (!/^src\//.test(file)) continue;
  for (const { n, text } of addedLines(file)) {
    if (/service_role|SERVICE_ROLE/.test(text)) {
      err(file, n, "La clé service_role contourne totalement RLS et ne doit jamais atteindre le navigateur. Elle n'est admise que dans supabase/functions/.");
    }
  }
}

// ------------------------------------------------------ 3. Migrations SQL : RLS & destructif
const newMigrations = addedFiles.filter((f) => /^supabase\/migrations\/.*\.sql$/.test(f));

for (const file of newMigrations) {
  if (!existsSync(file)) continue;
  const sql = readFileSync(file, 'utf8');
  const lower = sql.toLowerCase();

  warn(file, 1, "Nouvelle migration : le schéma Supabase appartient à Lovable. Vérifier qu'elle a bien été appliquée côté Lovable en premier (cf. CLAUDE.md).");

  if (/create\s+table/.test(lower)) {
    if (!/enable\s+row\s+level\s+security/.test(lower)) {
      err(file, 1, 'CREATE TABLE sans ENABLE ROW LEVEL SECURITY : la table serait lisible par n\'importe quel client anon.');
    } else if (!/create\s+policy/.test(lower)) {
      err(file, 1, 'RLS activée sans aucune policy : la table devient inaccessible même aux accès légitimes. Définir les policies dans la même migration.');
    }
  }

  if (/using\s*\(\s*true\s*\)/.test(lower)) {
    warn(file, 1, 'Policy en USING (true) : la table est publique en lecture. À confirmer explicitement.');
  }

  const allowDestructive = /--\s*guard:allow-destructive/.test(lower);
  const statements = lower.split(';');
  for (const st of statements) {
    const destructive =
      /drop\s+table/.test(st) ||
      /drop\s+column/.test(st) ||
      /\btruncate\b/.test(st) ||
      (/delete\s+from/.test(st) && !/\bwhere\b/.test(st));
    if (destructive && !allowDestructive) {
      err(file, 1, "Migration destructive (DROP / TRUNCATE / DELETE sans WHERE) sur une base qui contient des données de prod. Si c'est voulu, l'assumer avec un commentaire `-- guard:allow-destructive <raison>`.");
      break;
    }
  }
}

// ------------------------------------------------------------- 4. verify_jwt = false
const JWT_EXEMPT = new Set([
  'preview-transactional-email',
  'handle-email-unsubscribe',
  'handle-email-suppression',
]);

if (changed.includes('supabase/config.toml')) {
  const lines = addedLines('supabase/config.toml');
  const full = existsSync('supabase/config.toml')
    ? readFileSync('supabase/config.toml', 'utf8').split('\n')
    : [];
  for (const { n, text } of lines) {
    if (!/verify_jwt\s*=\s*false/.test(text)) continue;
    let fn = '(inconnue)';
    for (let i = n - 1; i >= 0; i--) {
      const m = (full[i] || '').match(/^\[functions\.([\w-]+)\]/);
      if (m) {
        fn = m[1];
        break;
      }
    }
    if (!JWT_EXEMPT.has(fn)) {
      err('supabase/config.toml', n, `verify_jwt = false sur "${fn}" : la fonction devient appelable sans authentification. Si c'est un webhook externe, elle doit valider elle-même sa provenance (signature ou token partagé) — le préciser en commentaire.`);
    }
  }
}

// ------------------------------------------------------------------------ Rapport
const emit = (kind, list) => {
  for (const { file, line, msg } of list) {
    if (CI) console.log(`::${kind} file=${file},line=${line}::${msg}`);
    console.log(`${kind === 'error' ? '❌' : '⚠️ '} ${file}:${line} — ${msg}`);
  }
};

console.log(`Garde sécurité — base ${base} (${mergeBase.slice(0, 8)}), ${changed.length} fichier(s) modifié(s)\n`);
emit('warning', warnings);
emit('error', errors);

if (errors.length) {
  console.log(`\n❌ ${errors.length} problème(s) de sécurité bloquant(s).`);
  process.exit(1);
}
console.log(`\n✅ Aucun problème de sécurité bloquant${warnings.length ? ` (${warnings.length} avertissement·s)` : ''}.`);
