# Activités sur Kidmapp (web, miroir app iOS)

Ajouter 5 catégories "activité" (nature, sport, creatif, culture, jeux) à `locations`, avec 4 nouveaux attributs (`duration`, `weather`, `effort`, `price`) et une expérience adaptée dans l'explorer, la fiche, la proposition et l'admin.

## 1. Base de données (migration idempotente)

```sql
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS weather  text,
  ADD COLUMN IF NOT EXISTS effort   text,
  ADD COLUMN IF NOT EXISTS price    text;
ALTER TABLE location_proposals
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS weather  text,
  ADD COLUMN IF NOT EXISTS effort   text,
  ADD COLUMN IF NOT EXISTS price    text;

ALTER TABLE locations         DROP CONSTRAINT IF EXISTS locations_category_check;
ALTER TABLE locations         ADD  CONSTRAINT locations_category_check
  CHECK (category IN ('restaurant','cafe','shop','public','coiffeur','nature','sport','creatif','culture','jeux'));
ALTER TABLE location_proposals DROP CONSTRAINT IF EXISTS location_proposals_category_check;
ALTER TABLE location_proposals ADD  CONSTRAINT location_proposals_category_check
  CHECK (category IN ('restaurant','cafe','shop','public','coiffeur','nature','sport','creatif','culture','jeux'));
```

Colonnes nullables (pas de défaut, pas de backfill). Types Supabase régénérés automatiquement.

Valeurs applicatives (non contraintes SQL — cohérence côté client) :
- `duration` ∈ {1h, 2-3h, Demi-journée, Journée}
- `weather` ∈ {Soleil, Pluie, Tout temps}
- `effort` ∈ {Tranquille, Modéré, Sportif}
- `price` ∈ {Gratuit, Payant}

## 2. Constantes partagées

- `src/types/location.ts` : étendre `LocationCategory` avec `nature | sport | creatif | culture | jeux`, compléter `categoryLabels` (Nature / Sport / Créatif / Culture / Jeux).
- Nouveau `src/lib/activity.ts` :
  - `ACTIVITY_CATEGORIES = ['nature','sport','creatif','culture','jeux']` + `isActivity(cat)`.
  - Enums `DURATIONS`, `WEATHERS`, `EFFORTS`, `PRICES = ['Gratuit','Payant']`.
  - `matchesDuration(loc, sel)` / `matchesWeather(loc, sel)` : un lieu sans valeur passe toujours (idem age filter).
- `src/assets/icons.ts` : ajouter 5 entrées dans `CATEGORY_ICONS` pour les nouvelles catégories, plus 5 gradients dans `LocationCard.categoryGradients`. En attendant des PNG dédiés, réutiliser des glyphes Lucide (TreePine, Dumbbell, Palette, Landmark, Puzzle) en fallback.

## 3. Barre de catégories en 2 groupes

`src/components/CategoryFilter.tsx` : deux sous-groupes visuels séparés par un divider vertical.

```text
[ Tout ] | Lieux: [Resto][Café][Boutique][Public][Coiffeur] | Activités: [Nature][Sport][Créatif][Culture][Jeux]
```

Un seul état actif, scroll horizontal conservé.

## 4. Filtres secondaires activité (Explorer)

- Nouveaux composants `ActivityWeatherFilter` et `ActivityDurationFilter` calqués sur `MealFilter` (pills, désélection au 2e clic).
- Dans `Index.tsx` :
  - états `selectedWeather` et `selectedDuration` + sync URL (`weather`, `duration`).
  - visibles uniquement si `isActivity(selectedCategory)`, animation `max-height` comme `MealFilter`.
  - filtrage 100% client : `matchesWeather` + `matchesDuration` uniquement quand la catégorie active est une activité.
  - reset auto quand on quitte une catégorie activité.
- Pas de filtre `price` dans l'explorer pour l'instant (à ajouter plus tard si besoin ; garde la barre lisible).

## 5. Carte lieu (grille) — durée + prix

`LocationCard.tsx` :
- Si `isActivity(location.category)` :
  - masquer les badges équipement.
  - afficher deux petits chips en bas : **durée** (`⏱ 2-3h`) et **prix** (`Gratuit` teinté vert / `Payant` teinté neutre). L'effort n'apparaît pas sur la carte (place limitée) — il reste visible sur la fiche.
  - chaque chip masqué si la valeur est absente.
- Ajouter les 5 gradients pour les nouvelles catégories.

## 6. Fiche lieu — Infos activité

`src/pages/LocationPage.tsx` : si `isActivity(location.category)`, remplacer la section "Équipements enfants" par **Infos activité** : grille 2×2 (Âge / Durée / Météo / Effort), valeurs manquantes → "—". Sous la grille, une **pastille prix** (verte si `Gratuit`, neutre si `Payant`, masquée si null). Reste de la fiche (photos, favoris, contribution, avis, liens, admin) inchangé.

## 7. Proposition (`ProposeLocationModal.tsx`)

- Sélecteur catégorie : 10 catégories groupées visuellement (Lieux / Activités).
- Step 1 adaptatif :
  - Catégorie lieu : inchangée.
  - Catégorie activité : masquer toggles équipement + `bookable`. Afficher **4 sélecteurs pills** (single-select, optionnels) : Durée, Météo, Effort, **Prix** (Gratuit / Payant). Âges (`age_min`/`age_max`) restent visibles.
- Step 2 (horaires / repas) : masqué pour les activités (déjà masqué hors resto/café).
- Submit : ajouter `duration`, `weather`, `effort`, `price` au payload (chaîne vide → `null`).
- Reset auto de ces 4 champs si l'utilisateur bascule vers une catégorie lieu.

## 8. Compte — historique propositions

`src/pages/AccountPage.tsx` : dans la liste des propositions, si catégorie activité :
- badge catégorie activité (couleur dédiée).
- afficher `duration • effort • weather • price` (valeurs présentes seulement) au lieu des équipements.

## 9. Admin (`AdminPage.tsx`)

- Modale édition lieu :
  - `category` : 10 catégories groupées (Lieux / Activités).
  - 4 nouveaux `<select>` : `duration`, `weather`, `effort`, `price` (valeurs des enums + option vide).
  - Toujours visibles pour rester simple ; save → `null` si vide.
- Revue des propositions : afficher `duration / weather / effort / price` quand présents, badge de catégorie pour les nouvelles catégories.
- Filtre catégorie du dashboard (s'il existe) : ajouter les 5 nouvelles catégories.

## Détails techniques

- Aucun refetch supplémentaire : filtres météo/durée = 100% client, comme âge et repas.
- Sync URL dans `Index.tsx` : ajouter `weather` et `duration` aux paramètres valides ; nettoyer lors du changement vers une catégorie non-activité.
- Types : `Location`/`Contribution` dérivés des types générés Supabase → les 4 nouvelles colonnes disponibles automatiquement après régénération. Repli `as any` possible tant que les types ne sont pas régénérés.
- Contraintes CHECK idempotentes via `DROP … IF EXISTS` + `ADD` avec nom explicite.
- Aucune modification RLS/GRANT nécessaire.

## Fichiers touchés

- Migration Supabase (locations + location_proposals : colonnes + CHECK).
- `src/types/location.ts`, `src/lib/activity.ts` (nouveau), `src/assets/icons.ts`.
- `src/components/CategoryFilter.tsx`, `src/components/Header.tsx`.
- Nouveaux `src/components/ActivityWeatherFilter.tsx`, `src/components/ActivityDurationFilter.tsx`.
- `src/pages/Index.tsx` (état, URL, filtres, rendu conditionnel).
- `src/components/LocationCard.tsx` (chips durée + prix + gradients).
- `src/pages/LocationPage.tsx` (section Infos activité + pastille prix).
- `src/components/ProposeLocationModal.tsx` (form adaptatif avec 4 pills).
- `src/pages/AccountPage.tsx` (affichage propositions activité).
- `src/pages/AdminPage.tsx` (édition + revue).
