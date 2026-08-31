#!/usr/bin/env node
/**
 * Ratchet eslint — la dette existante est gelée, elle ne doit plus augmenter.
 *
 *   node scripts/eslint-ratchet.mjs [--base origin/main]   # vérifie les fichiers de la PR
 *   node scripts/eslint-ratchet.mjs --update               # régénère le baseline
 *
 * Le baseline (.eslint-baseline.json) associe chaque fichier à son nombre d'erreurs au moment
 * du gel. Une PR échoue si elle fait monter ce nombre sur un fichier, ou si elle introduit un
 * fichier neuf qui n'est pas propre. Elle ne paie jamais pour la dette qu'elle n'a pas créée.
 */
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE = '.eslint-baseline.json';
const CI = !!process.env.GITHUB_ACTIONS;
const LINTABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const argv = process.argv.slice(2);
const update = argv.includes('--update');
const base = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'origin/main';

/** Lance eslint et rend une map fichier → nombre d'erreurs (les warnings ne comptent pas). */
function lint(targets) {
  let raw;
  try {
    raw = execFileSync('npx', ['eslint', '--format', 'json', ...targets], {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (e) {
    // eslint sort en 1 dès qu'il trouve une erreur : le JSON est sur stdout, c'est normal.
    raw = e.stdout;
    if (!raw) {
      console.error("❌ eslint n'a pas pu tourner :\n" + (e.stderr || e.message));
      process.exit(2);
    }
  }
  const counts = {};
  for (const f of JSON.parse(raw)) {
    const rel = f.filePath.replace(process.cwd() + '/', '');
    if (f.errorCount > 0) counts[rel] = f.errorCount;
  }
  return counts;
}

// ------------------------------------------------------------------ mode --update
if (update) {
  const files = lint(['.']);
  const total = Object.values(files).reduce((a, b) => a + b, 0);
  writeFileSync(
    BASELINE,
    JSON.stringify(
      {
        _comment:
          'Dette eslint gelée. Ne pas éditer à la main : régénérer avec `npm run lint:baseline`. Les nombres ne doivent que descendre.',
        totalErrors: total,
        files,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`✅ Baseline régénéré : ${Object.keys(files).length} fichier(s), ${total} erreur(s) gelée(s).`);
  process.exit(0);
}

// ------------------------------------------------------------------- mode vérification
if (!existsSync(BASELINE)) {
  console.error(`❌ ${BASELINE} absent. Le générer une fois avec : npm run lint:baseline`);
  process.exit(2);
}
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).files || {};

let mergeBase;
try {
  mergeBase = execSync(`git merge-base ${base} HEAD`, { encoding: 'utf8' }).trim();
} catch {
  console.error(`⚠️  Base "${base}" introuvable — ratchet ignoré.`);
  process.exit(0);
}

const changed = execSync(`git diff --name-only --diff-filter=ACMR ${mergeBase}..HEAD`, {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f && LINTABLE.test(f) && existsSync(f));

if (changed.length === 0) {
  console.log('Aucun fichier lintable modifié — ratchet sans objet.');
  process.exit(0);
}

const now = lint(changed);
const regressions = [];
let improved = 0;

for (const file of changed) {
  const before = baseline[file] ?? 0;
  const after = now[file] ?? 0;
  if (after > before) regressions.push({ file, before, after });
  else if (after < before) improved += before - after;
}

console.log(`Ratchet eslint — base ${base} (${mergeBase.slice(0, 8)}), ${changed.length} fichier(s) lintable(s)\n`);

for (const { file, before, after } of regressions) {
  const msg =
    before === 0
      ? `${after} erreur(s) eslint sur un fichier qui était propre. Les corriger avant merge.`
      : `erreurs eslint : ${before} → ${after} (+${after - before}). La dette gelée ne doit pas augmenter.`;
  if (CI) console.log(`::error file=${file}::${msg}`);
  console.log(`❌ ${file} — ${msg}`);
}

if (regressions.length) {
  console.log(`\n   Détail : npx eslint ${regressions.map((r) => r.file).join(' ')}`);
  console.log(`\n❌ ${regressions.length} fichier(s) en régression eslint.`);
  process.exit(1);
}

console.log(`✅ Pas de régression eslint${improved ? ` — et ${improved} erreur(s) en moins, baseline à rafraîchir avec \`npm run lint:baseline\`` : ''}.`);
