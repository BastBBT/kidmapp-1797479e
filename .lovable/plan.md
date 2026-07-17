# Filtre "Âge de l'enfant" côté web

## 1. Base de données (migration idempotente)

```sql
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS age_min int,
  ADD COLUMN IF NOT EXISTS age_max int;

ALTER TABLE public.location_proposals
  ADD COLUMN IF NOT EXISTS age_min int,
  ADD COLUMN IF NOT EXISTS age_max int;
```

Les deux colonnes sont **nullables** — l'âge est totalement optionnel sur un lieu. `NULL` (min et/ou max) = « tous âges » : le lieu passe toutes les tranches et n'est jamais filtré. Aucun défaut, aucune contrainte NOT NULL, aucun backfill.

## 2. Constantes & helpers partagés

Nouveau `src/lib/ageFilter.ts` :
- `AGE_BUCKETS = { all, '0-2':[0,2], '3-5':[3,5], '6+':[6,99] }`.
- `matchesAge(loc, bucket)` : `(age_min ?? 0) <= max && (age_max ?? 99) >= min`. Un lieu avec `age_min`/`age_max` NULL passe toujours.
- `adequacyScore(loc, bucket)` :
  - `0-2` : `changing_table` +1, `high_chair` +1
  - `3-5` : `high_chair` +1, `kids_menu` +1, `kids_area` +1
  - `6+`  : `kids_area` +1, `kids_menu` +1
- `relevantEquipForBucket(bucket)` : ordre des `EquipKey` mis en avant.

## 3. Explorer (`Header` + `Index.tsx`)

- Nouveau `src/components/AgeFilter.tsx` : 4 pills persistantes (Tous / 0-2 / 3-5 / 6+), style aligné sur `CategoryFilter`.
- Placé sous la barre de catégories dans `Header` (toujours visible, indépendant de la catégorie), et dupliqué dans la carte plein écran comme `MealFilter`.
- État `selectedAge` dans `Index.tsx`, synchro URL (`?age=`).
- Client-only : après le filtre existant, appliquer `matchesAge` puis trier par `adequacyScore` DESC, tie-break alphabétique. Pas de refetch.

## 4. `LocationCard`

- Prop `ageBucket?`. Si actif : équipements pertinents en tête + bord/teinte primaire renforcé ; autres en style neutre.

## 5. Fiche lieu (`LocationServicesSection`)

- Sélecteur d'âge local (4 pills) au-dessus des équipements.
- Verdict basé sur les équipements pertinents pour la tranche :
  - tous présents → vert « Tout y est pour cet âge »
  - au moins un → ambre « Bien adapté (X/Y besoins clés) »
  - aucun → gris « Peu d'infos pour cet âge »
  - verdict masqué si tranche = Tous.
- Équipements pertinents affichés en tête + étoile/teinte primaire.

## 6. Proposition & Admin

- `ProposeLocationModal` : dans le step Détails, deux champs numériques **optionnels** : « Dès X ans » (`age_min`) et « Jusqu'à Y ans » (`age_max`). Aucun n'est requis. Validation légère : si les deux fournis, `age_max >= age_min` ; valeurs 0-99. Champs vides → `null` envoyé.
- `AdminPage` : mêmes deux champs optionnels dans la modale édition location + affichage dans la revue des propositions. Un bouton « Effacer » (ou simple champ vide) permet de repasser à `null`.

## 7. Renommage libellé

Dans `src/assets/icons.ts` : `EQUIP_LABELS.high_chair = 'Chaise haute / réhausseur'`. `EQUIP_SHORT_LABELS.high_chair` reste `Chaise` (contrainte chips). Remplacer chaque occurrence en dur dans proposition/admin/fiche.

## Fichiers touchés

- Migration Supabase (locations + location_proposals)
- `src/lib/ageFilter.ts` (nouveau)
- `src/components/AgeFilter.tsx` (nouveau)
- `src/components/Header.tsx`, `src/pages/Index.tsx`
- `src/components/LocationCard.tsx`
- `src/components/LocationServicesSection.tsx` (+ `LocationPage.tsx` si besoin)
- `src/components/ProposeLocationModal.tsx`
- `src/pages/AdminPage.tsx`
- `src/assets/icons.ts`

## Notes

- Filtre âge = 100% client, `useLocations` inchangé.
- URL sync : ajouter `age` aux paramètres valides dans `Index.tsx`.
- Un lieu sans âge renseigné (cas par défaut, majoritaire au départ) reste visible partout et prend uniquement le score équipement pour le tri.
