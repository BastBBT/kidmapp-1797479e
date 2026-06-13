## Objectif

Enrichir le mail hebdomadaire admin avec un bloc « Visites » sur 14 jours (semaine A vs B) et exclure toute l'activité des comptes admin (contributions, propositions **et** visites).

## Périodes

- **Semaine A** (mise en avant + graphique) : lundi J-7 → dimanche J-1.
- **Semaine B** (comparatif) : lundi J-14 → dimanche J-8.
- Variation : `(A - B) / B` en %. Badge vert si ≥ 0, rouge si < 0, masqué si B = 0 (affiché « nouveau »).

## Récap complet du mail après modif

1. **En-tête** : « 📊 Rapport hebdomadaire » + sous-titre « Semaine du {periodLabel} ».
2. **Bloc stats (4 cartes, nouvel ordre)** :
   1. **Visites (7j)** — total Semaine A + badge variation vs Semaine B
   2. **Utilisateurs actifs** (Semaine A, hors admins)
   3. **Contributions** (Semaine A, hors admins)
   4. **Propositions** (Semaine A, hors admins)
3. **Mini graphique en barres** (nouveau, juste sous les stats) : 7 barres Lun→Dim de la Semaine A, vert `#3B7D6E` sur fond `#EDEAE3`, hauteur max ~80px, rendu HTML/CSS inline (compatible Gmail/Outlook). Chiffre au-dessus de chaque barre + label jour en dessous.
4. **Détail par utilisateur** : contributeurs hors admins (contributions + propositions Semaine A). Vide → « Aucune activité cette semaine. »
5. **Footer** inchangé.

## Détails techniques

### `supabase/functions/weekly-admin-report/index.ts`

- Récupérer `adminIds` (profiles.role = 'admin') **avant** les calculs.
- Bornes UTC des 2 semaines. Fetch parallèle :
  - `contributions` Semaine A
  - `location_proposals` Semaine A
  - `page_views` Semaine A (created_at, user_id)
  - `page_views` Semaine B (created_at, user_id)
- Exclure `user_id ∈ adminIds` partout (les visites anonymes `user_id IS NULL` sont conservées).
- Bucketer la Semaine A par jour (Lun→Dim) → `[{label:'Lun', count:N}, ...]`.
- Calculer `totalA`, `totalB`, `deltaPct` (null si `totalB === 0`).
- Passer au template : `visits: { totalA, totalB, deltaPct, daily: [...] }`.

### `supabase/functions/_shared/transactional-email-templates/weekly-admin-report.tsx`

- Ajouter prop `visits`.
- Réordonner les 4 `statBox` : Visites → Utilisateurs actifs → Contributions → Propositions.
- Carte Visites avec badge de variation coloré.
- Composant `BarChart` inline (`<table>` 7 colonnes, divs à hauteur proportionnelle, 100% inline-styles).
- Étendre `previewData` avec un exemple `visits`.

## Hors scope

- Pas de migration SQL ni de modif RLS (fonction en service_role).
- Pas de modif du cron, des destinataires, de l'infra email.
- Pas de graphique image — barres HTML/CSS uniquement.
- Pas de changement à `notify-validation` ni autres fonctions.

## Fichiers touchés

- `supabase/functions/weekly-admin-report/index.ts`
- `supabase/functions/_shared/transactional-email-templates/weekly-admin-report.tsx`
