# Top 5 contributeurs & proposants — Admin

Ajout d'une section "Top contributeurs" sur la page admin avec deux mini-classements côte à côte (empilés sur mobile).

## Ce qui sera affiché

**Top 5 — Propositions de lieux**
- Rang, email du user, total propositions (tous statuts), dont approuvées

**Top 5 — Contributions équipements**
- Rang, email du user, total contributions, dont validées
- Exclut les contributions anonymes (`user_id IS NULL`)

**Exclusion des admins** : les comptes avec `profiles.role = 'admin'` (Julie et toi) sont filtrés des deux classements.

## Détails techniques

- Pas de nouvelle table ni migration — agrégation à la volée depuis `location_proposals` et `contributions` (volumes faibles : ~50 propositions, ~11 contributions).
- Nouveau hook `useTopContributors()` :
  1. Récupère les `user_id` admin via `profiles` où `role = 'admin'`
  2. Récupère les lignes des deux tables, filtre les admins, groupe par `user_id` en JS
  3. Trie, garde top 5 de chaque
- Réutilise `useUserEmails()` (déjà créé) pour résoudre les emails.
- Affichage : 2 `<Card>` avec un petit `<Table>` chacune, intégrées dans `AdminPage.tsx` sous la section stats existante.

## Fichier modifié

- `src/pages/AdminPage.tsx` (ajout de la section + hook)

## Évolutions futures possibles

- Période glissante (30j / 90j / tout temps) via `<Select>`
- Top favoris
- Bascule vers vue SQL ou edge function si les volumes explosent (>10k lignes)
