#!/usr/bin/env node
/**
 * Garde sécurité Kidmapp — analyse UNIQUEMENT les lignes ajoutées par la PR.
 *
 *   node scripts/security-guard.mjs [--base origin/main]
 *
 * Sort en code 1 si une erreur est trouvée, ou si la base de comparaison est irrésolvable
 * (fail-closed : une garde qui abandonne en silence produit un vert mensonger).
 * Les avertissements n'échouent pas le build. Ne juge jamais la dette existante.
 *
 * LIMITE CONNUE, non corrigeable par des motifs : un secret coupé en plusieurs littéraux
 * concaténés (`"AIzaSyD-123" + "456…"`) est invisible pour tout scanner ligne à ligne.
 */
import { execFileSync } from 'node:child_process';
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

/**
 * Appelle git SANS shell — les arguments (dont les noms de fichiers venant de la PR) ne sont
 * jamais interprétés, ce qui ferme l'injection de commande par nom de fichier.
 * `core.quotepath=false` évite que git rende les chemins non-ASCII sous forme échappée
 * (`"src/R\303\251servation.ts"`), ce qui les faisait échapper silencieusement au scan.
 */
const git = (...args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

let mergeBase;
try {
  mergeBase = git('merge-base', base, 'HEAD').trim();
} catch {
  console.log(`❌ Base de comparaison "${base}" irrésolvable : impossible de déterminer les lignes ajoutées.`);
  console.log('   La garde échoue volontairement plutôt que de rendre un vert non fondé.');
  console.log('   Pistes : vérifier fetch-depth (0 attendu), ou passer une base explicite (--base <sha>).');
  process.exit(1);
}

const changed = git('diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}..HEAD`)
  .split('\n')
  .filter(Boolean);
const addedFiles = git('diff', '--name-only', '--diff-filter=A', `${mergeBase}..HEAD`)
  .split('\n')
  .filter(Boolean);

if (changed.length === 0) {
  console.log('Aucun fichier modifié — rien à vérifier.');
  process.exit(0);
}

/**
 * Contenu généré ou binaire, et les gardes elles-mêmes (leurs motifs sont du code, pas des
 * secrets). Ancré sur le chemin complet : un `src/lib/security-guard.mjs` ne doit pas hériter
 * de l'exemption par simple homonymie de basename.
 */
const SCAN_SKIP =
  /^(scripts\/(security-guard\.mjs|eslint-ratchet\.mjs|secret-scan\.py)|package-lock\.json|bun\.lock|bun\.lockb|dist\/|node_modules\/|\.eslint-baseline\.json)/;

/** Lignes ajoutées par la PR, par fichier, avec leur numéro de ligne réel. */
function addedLines(file) {
  let diff;
  try {
    diff = git('diff', '-U0', `${mergeBase}..HEAD`, '--', file);
  } catch (e) {
    // Ne jamais rendre [] en silence : un fichier illisible doit échouer bruyamment,
    // sinon il échappe au scan sans laisser de trace.
    console.log(`❌ git diff a échoué sur ${file} : ${e.stderr || e.message}`);
    process.exit(1);
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
const JWT_RE = /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}/;

const SECRET_PATTERNS = [
  [/\bsb_secret_[A-Za-z0-9_-]{16,}/, 'clé secrète Supabase (sb_secret_…)'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'clé secrète style OpenAI/Anthropic (sk-…)'],
  [/\bre_[A-Za-z0-9]{20,}/, 'clé API Resend (re_…)'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clé privée'],
  [/\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}/, 'token GitHub'],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, 'token GitHub (PAT fin)'],
  [/\bAIza[0-9A-Za-z_-]{30,}/, 'clé API Google'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'token Slack'],
  // Littéral sans espace assigné à un nom qui sent le secret. Backticks inclus : un
  // template literal était auparavant invisible.
  [
    /(service_?role|service_?key|api_?key|apikey|secret|password|passwd|token|auth_?key)[A-Za-z_]*\s*[:=]\s*["'`]+[^"'`$\s{][^\s"'`]{13,}["'`]+/i,
    "secret assigné en littéral (utiliser une variable d'environnement)",
  ],
];

/**
 * Placeholders et exemples. IMPORTANT : confrontés à la SOUS-CHAÎNE qui a matché, jamais à la
 * ligne entière — sinon un mot anodin ailleurs sur la ligne blanchirait un vrai secret
 * (`createClient(url, "sb_secret_…", { ...opts })` passait à cause du spread).
 */
const SECRET_ALLOW =
  /(<[A-Z_]+>|xxx|XXX|placeholder|example|EXEMPLE|your[-_]|dummy|redacted|fake|changeme|todo)/i;

/** Lectures d'environnement légitimes, reconnues au niveau de la sous-chaîne matchée. */
const ENV_READ = /(process\.env|Deno\.env|import\.meta\.env)/;

/**
 * Rôles de JWT Supabase publics par design : la clé anon/publishable est servie au navigateur
 * de toute façon. Seule la service_role est critique — d'où un jugement sur la claim, pas sur
 * l'allure du token. La signature n'est pas vérifiée : cette claim ne sert qu'à ABAISSER la
 * sévérité, et tout payload douteux rend null, ce qui remonte en erreur.
 */
const PUBLIC_JWT_ROLES = new Set(['anon', 'publishable']);

function jwtRole(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded && typeof decoded === 'object' && !Array.isArray(decoded)
      ? (decoded.role ?? null)
      : null;
  } catch {
    return null;
  }
}

let scanned = 0;
for (const file of changed) {
  if (SCAN_SKIP.test(file)) continue;
  scanned++;
  for (const { n, text } of addedLines(file)) {
    const jwt = text.match(JWT_RE);
    if (jwt && !SECRET_ALLOW.test(jwt[0])) {
      const role = jwtRole(jwt[0]);
      if (PUBLIC_JWT_ROLES.has(role)) {
        warn(file, n, `JWT Supabase en dur avec role=${role} : publique par design, donc acceptable. Préférer tout de même import.meta.env, et vérifier qu'il s'agit bien du projet attendu.`);
      } else {
        err(file, n, `JWT en dur avec role=${role ?? 'illisible'} : hors anon/publishable, une clé Supabase ne doit jamais être écrite dans le code. Révoquer la clé si elle a été poussée.`);
      }
      continue;
    }

    for (const [re, label] of SECRET_PATTERNS) {
      const m = text.match(re);
      if (!m) continue;
      if (SECRET_ALLOW.test(m[0]) || ENV_READ.test(m[0])) continue;
      err(file, n, `Secret potentiel : ${label}. Passer par une variable d'environnement / un secret Supabase, et révoquer la valeur si elle a été poussée.`);
      break;
    }
  }
}

// ------------------------------------------- 2. service_role hors des edge functions
// Couvre tout le repo sauf les edge functions, qui sont le seul endroit légitime.
// Auparavant limité à ^src/, ce qui laissait index.html, public/, vite.config.ts, scripts/.
for (const file of changed) {
  if (/^supabase\/functions\//.test(file) || SCAN_SKIP.test(file)) continue;
  for (const { n, text } of addedLines(file)) {
    if (/service_role|SERVICE_ROLE/.test(text)) {
      err(file, n, "La clé service_role contourne totalement RLS et ne doit jamais atteindre le navigateur. Elle n'est admise que dans supabase/functions/.");
    }
  }
}

// ------------------------------------------------------ 3. Migrations SQL : RLS & destructif

/** Retire commentaires de ligne et de bloc : un `-- on ne fait PAS de drop table` ne doit pas
 *  déclencher la détection destructive. */
// Le remplacement PRÉSERVE LA LONGUEUR : les décalages restent alignés entre le SQL
// d'origine et sa version nettoyée, ce qui permet de retrouver le commentaire attaché à
// une instruction donnée. Un `replace(..., ' ')` désalignait tout.
const stripSqlComments = (sql) =>
  sql
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));

const newMigrations = addedFiles.filter((f) => /^supabase\/migrations\/.*\.sql$/.test(f));

for (const file of newMigrations) {
  if (!existsSync(file)) continue;
  const raw = readFileSync(file, 'utf8');
  const lower = raw.toLowerCase();
  const code = stripSqlComments(lower);

  warn(file, 1, "Nouvelle migration : le schéma Supabase appartient à Lovable. Vérifier qu'elle a bien été appliquée côté Lovable en premier (cf. CLAUDE.md).");

  // --- RLS exigée TABLE PAR TABLE. Auparavant global au fichier : une table conforme
  //     suffisait à blanchir toutes les autres du même fichier.
  const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?[\w]+"?\.)?"?([\w]+)"?/g;
  for (const m of code.matchAll(tableRe)) {
    const table = m[1];
    const rlsOn = new RegExp(
      `alter\\s+table\\s+(?:"?[\\w]+"?\\.)?"?${table}"?[\\s\\S]{0,200}?enable\\s+row\\s+level\\s+security`,
    ).test(code);
    const hasPolicy = new RegExp(
      `create\\s+policy[\\s\\S]{0,200}?\\son\\s+(?:"?[\\w]+"?\\.)?"?${table}"?`,
    ).test(code);
    if (!rlsOn) {
      err(file, 1, `Table "${table}" créée sans ENABLE ROW LEVEL SECURITY : elle serait lisible par n'importe quel client anon.`);
    } else if (!hasPolicy) {
      err(file, 1, `Table "${table}" : RLS activée sans aucune policy — la table devient inaccessible même aux accès légitimes. Définir les policies dans la même migration.`);
    }
  }

  if (/using\s*\(\s*true\s*\)/.test(code)) {
    warn(file, 1, 'Policy en USING (true) : la table est publique en lecture. À confirmer explicitement.');
  }

  // --- Opérations destructives, évaluées PAR INSTRUCTION. L'échappatoire
  //     `-- guard:allow-destructive` doit être sur l'instruction concernée (dans les
  //     200 caractères qui la précèdent), pas n'importe où dans le fichier.
  const DESTRUCTIVE = [
    [/drop\s+table/, 'DROP TABLE'],
    [/drop\s+column/, 'DROP COLUMN'],
    [/\btruncate\b/, 'TRUNCATE'],
    [/drop\s+policy/, 'DROP POLICY (retire une protection RLS existante)'],
    [/disable\s+row\s+level\s+security/, 'DISABLE ROW LEVEL SECURITY (ouvre une table existante)'],
    [/alter\s+column\s+[\s\S]*?\btype\b/, 'ALTER COLUMN … TYPE (conversion destructive)'],
    [/drop\s+(?:function|trigger|view)/, 'DROP FUNCTION/TRIGGER/VIEW'],
  ];

  let offset = 0;
  for (const st of code.split(';')) {
    const start = offset;
    offset += st.length + 1;
    if (!st.trim()) continue;
    // L'échappatoire doit être DANS le bloc de l'instruction concernée (les commentaires
    // qui précèdent une instruction appartiennent à son bloc après découpage sur `;`).
    // Une fenêtre de 200 caractères laissait une justification couvrir l'instruction
    // suivante — c'est exactement le trou constaté.
    const allowed = /--\s*guard:allow-destructive/.test(lower.slice(start, start + st.length));
    if (allowed) continue;
    if (/delete\s+from/.test(st) && !/\bwhere\b/.test(st)) {
      err(file, 1, "DELETE sans WHERE sur une base contenant des données de prod. Si c'est voulu, l'assumer avec `-- guard:allow-destructive <raison>` juste avant l'instruction.");
      continue;
    }
    for (const [re, label] of DESTRUCTIVE) {
      if (re.test(st)) {
        err(file, 1, `Migration destructive : ${label}. La migration doit pouvoir passer sur une base contenant déjà des données de prod. Si c'est voulu, l'assumer avec \`-- guard:allow-destructive <raison>\` juste avant l'instruction.`);
        break;
      }
    }
  }
}

// ------------------------------------------------------------- 4. verify_jwt = false
// Seule exception réellement présente sur main. Ne PAS pré-autoriser de noms absents du
// fichier : ce serait une approbation dormante qui passerait sans revue le jour venu.
const JWT_EXEMPT = new Set(['preview-transactional-email']);

// Tout le fichier est reparsé, pas seulement les lignes ajoutées : renommer une section
// exemptée en laissant `verify_jwt = false` intact rendait auparavant une nouvelle fonction
// publique sans qu'aucune ligne `verify_jwt` n'apparaisse dans le diff.
if (changed.includes('supabase/config.toml') && existsSync('supabase/config.toml')) {
  const lines = readFileSync('supabase/config.toml', 'utf8').split('\n');
  let fn = null;
  lines.forEach((line, i) => {
    const section = line.match(/^\s*\[functions\.([\w-]+)\]/);
    if (section) fn = section[1];
    if (/verify_jwt\s*=\s*false/.test(line) && !JWT_EXEMPT.has(fn)) {
      err('supabase/config.toml', i + 1, `verify_jwt = false sur "${fn ?? '(section inconnue)'}" : la fonction devient appelable sans authentification. Si c'est un webhook externe, elle doit valider elle-même sa provenance (signature ou token partagé) — le préciser en commentaire, puis ajouter la fonction à JWT_EXEMPT dans cette garde.`);
    }
  });
}

// ------------------------------------------------------------------------ Rapport
const emit = (kind, list) => {
  for (const { file, line, msg } of list) {
    if (CI) console.log(`::${kind} file=${file},line=${line}::${msg}`);
    console.log(`${kind === 'error' ? '❌' : '⚠️ '} ${file}:${line} — ${msg}`);
  }
};

console.log(`Garde sécurité — base ${base} (${mergeBase.slice(0, 8)}), ${changed.length} fichier(s) modifié(s), ${scanned} scanné(s)\n`);
emit('warning', warnings);
emit('error', errors);

if (errors.length) {
  console.log(`\n❌ ${errors.length} problème(s) de sécurité bloquant(s).`);
  process.exit(1);
}
console.log(`\n✅ Aucun problème de sécurité bloquant${warnings.length ? ` (${warnings.length} avertissement·s)` : ''}.`);
