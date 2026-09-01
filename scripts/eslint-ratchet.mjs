#!/usr/bin/env node
/**
 * Ratchet eslint — la dette existante ne doit pas augmenter.
 *
 *   node scripts/eslint-ratchet.mjs [--base origin/main]
 *
 * Pour chaque fichier lintable touché par la PR, eslint est lancé DEUX fois : sur la version
 * de la PR, et sur celle de la merge-base. La PR échoue si le nombre d'erreurs monte sur un
 * fichier. Elle ne paie jamais pour la dette qu'elle n'a pas créée.
 *
 * La référence est mesurée à la merge-base, pas lue dans un fichier versionné. Un baseline
 * figé souffrait de trois défauts que cette approche supprime par construction :
 *   - un fichier réécrit de zéro sur un chemin legacy héritait du quota d'erreurs de l'ancien ;
 *   - le baseline devenait faux dès que la dette bougeait sans être régénéré ;
 *   - un simple renommage était rapporté comme une régression.
 *
 * Sort en 1 sur régression ou base irrésolvable (fail-closed), 0 sinon.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const CI = !!process.env.GITHUB_ACTIONS;
const LINTABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const argv = process.argv.slice(2);
const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'origin/main';

const git = (...args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

/** Lance eslint depuis `cwd` et rend une map cheminRelatif → nombre d'erreurs. */
function lint(targets, cwd) {
  if (targets.length === 0) return {};
  let raw;
  try {
    raw = execFileSync('npx', ['eslint', '--format', 'json', ...targets], {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      cwd,
    });
  } catch (e) {
    // eslint sort en 1 dès qu'il trouve une erreur : le JSON est sur stdout, c'est normal.
    raw = e.stdout;
    if (!raw) {
      console.log(`❌ eslint n'a pas pu tourner dans ${cwd} :\n${e.stderr || e.message}`);
      process.exit(1);
    }
  }
  // eslint rend des chemins RÉELS. Sur macOS /var est un lien vers /private/var : un
  // simple replace() du cwd logique produisait des clés corrompues, donc une base
  // mesurée vide et des régressions fantômes. `relative(realpath(cwd), …)` est exact
  // sur les deux plateformes.
  const root = realpathSync(cwd);
  const counts = {};
  for (const f of JSON.parse(raw)) {
    const rel = relative(root, f.filePath);
    if (f.errorCount > 0) counts[rel] = f.errorCount;
  }
  return counts;
}

let mergeBase;
try {
  mergeBase = git('merge-base', base, 'HEAD').trim();
} catch {
  console.log(`❌ Base de comparaison "${base}" irrésolvable : impossible de mesurer la dette de référence.`);
  console.log('   Le ratchet échoue volontairement plutôt que de rendre un vert non fondé.');
  console.log('   Piste : vérifier fetch-depth (0 attendu).');
  process.exit(1);
}

// --- Fichiers touchés, et correspondance nouveau → ancien chemin pour les renommages,
//     afin qu'un fichier déplacé soit comparé à sa propre version d'origine.
const previousPath = new Map();
for (const line of git('diff', '-M', '--name-status', `${mergeBase}..HEAD`).split('\n')) {
  const parts = line.split('\t');
  if (parts[0]?.startsWith('R') && parts.length === 3) previousPath.set(parts[2], parts[1]);
}

const changed = git('diff', '-M', '--name-only', '--diff-filter=ACMR', `${mergeBase}..HEAD`)
  .split('\n')
  .filter((f) => f && LINTABLE.test(f) && existsSync(f));

if (changed.length === 0) {
  console.log('Aucun fichier lintable modifié — ratchet sans objet.');
  process.exit(0);
}

// --- Mesure sur la version de la PR
const head = lint(changed, process.cwd());

// --- Mesure sur la merge-base, dans un worktree jetable
const baseDir = mkdtempSync(join(tmpdir(), 'ratchet-base-'));
let baseCounts = {};
try {
  git('worktree', 'add', '-q', '--detach', baseDir, mergeBase);

  // eslint a besoin des plugins : on réutilise l'installation déjà présente.
  const nm = resolve('node_modules');
  if (existsSync(nm)) {
    try {
      symlinkSync(nm, join(baseDir, 'node_modules'), 'dir');
    } catch {
      /* déjà présent */
    }
  }

  const baseTargets = changed
    .map((f) => previousPath.get(f) ?? f)
    .filter((f) => existsSync(join(baseDir, f)));

  baseCounts = lint(baseTargets, baseDir);
} finally {
  try {
    git('worktree', 'remove', '--force', baseDir);
  } catch {
    rmSync(baseDir, { recursive: true, force: true });
  }
  git('worktree', 'prune');
}

// --- Comparaison
const regressions = [];
let improved = 0;
for (const file of changed) {
  const before = baseCounts[previousPath.get(file) ?? file] ?? 0;
  const after = head[file] ?? 0;
  if (after > before) regressions.push({ file, before, after });
  else if (after < before) improved += before - after;
}

// --- Toute directive eslint-disable ajoutée doit être justifiée. Sans ça, il suffisait
//     d'un `/* eslint-disable */` en tête de fichier pour ramener le compte à zéro et
//     faire passer n'importe quel ajout.
const undocumentedDisables = [];
for (const file of changed) {
  const diff = git('diff', '-U0', `${mergeBase}..HEAD`, '--', `:(literal)${file}`);
  let lineNo = 0;
  for (const raw of diff.split('\n')) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNo = parseInt(hunk[1], 10);
      continue;
    }
    if (raw.startsWith('+++') || raw.startsWith('---')) continue;
    if (!raw.startsWith('+')) continue;
    const text = raw.slice(1);
    lineNo++;
    // La directive n'est reconnue que si elle ouvre le PREMIER commentaire de la ligne.
    // Sinon un commentaire qui cite `/* eslint-disable */` pour en parler — ou un
    // littéral contenant la chaîne — serait signalé à tort.
    const opener = text.search(/\/\/|\/\*/);
    const isDirective =
      opener !== -1 &&
      /^(\/\/|\/\*)\s*eslint-disable(-next-line|-line)?\b/.test(text.slice(opener));
    if (isDirective && !/\s--\s+\S/.test(text)) {
      undocumentedDisables.push({ file, line: lineNo - 1, text: text.trim().slice(0, 100) });
    }
  }
}

console.log(`Ratchet eslint — base ${base} (${mergeBase.slice(0, 8)}), ${changed.length} fichier(s) lintable(s)\n`);

for (const { file, before, after } of regressions) {
  const msg =
    before === 0
      ? `${after} erreur(s) eslint sur un fichier qui était propre à la base. Les corriger avant merge.`
      : `erreurs eslint : ${before} → ${after} (+${after - before}). La dette ne doit pas augmenter.`;
  if (CI) console.log(`::error file=${file}::${msg}`);
  console.log(`❌ ${file} — ${msg}`);
}

for (const { file, line, text } of undocumentedDisables) {
  const msg = `Directive eslint-disable ajoutée sans justification : \`${text}\`. Ajouter la raison après \` -- \` (ex. \`// eslint-disable-next-line react-hooks/exhaustive-deps -- la dépendance recrée une boucle\`).`;
  if (CI) console.log(`::error file=${file},line=${line}::${msg}`);
  console.log(`❌ ${file}:${line} — ${msg}`);
}

if (regressions.length || undocumentedDisables.length) {
  if (regressions.length) {
    console.log(`\n   Détail : npx eslint ${regressions.map((r) => r.file).join(' ')}`);
  }
  console.log(
    `\n❌ ${regressions.length} fichier(s) en régression eslint` +
      `${undocumentedDisables.length ? `, ${undocumentedDisables.length} directive(s) eslint-disable non justifiée(s)` : ''}.`,
  );
  process.exit(1);
}

console.log(`✅ Pas de régression eslint${improved ? ` — et ${improved} erreur(s) en moins` : ''}.`);
