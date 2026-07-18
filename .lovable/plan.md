Refonte des filtres d'exploration pour gagner en largeur et réduire l'encombrement vertical.

## Objectif
Transformer la ligne unique de catégories (Lieux + Activités) en deux lignes empilées, et réduire légèrement la hauteur des pills de filtre (catégories + âge) pour moins bouffer l'interface.

## Fichiers concernés
- `src/components/CategoryFilter.tsx`
- `src/components/AgeFilter.tsx`
- `src/components/Header.tsx` (ajustements d'espacement si nécessaire)

## Détails d'implémentation

### 1. CategoryFilter : deux lignes empilées
- Passer de `flex-row` unique à une colonne de deux lignes.
- Ligne 1 : label "Lieux" + pills des `PLACE_CATEGORIES`.
- Ligne 2 : label "Activités" + pills des `ACTIVITY_CATEGORIES`.
- Conserver le pill "Tout" en haut à gauche ou le placer sur sa propre ligne si plus clair.
- Réduire la hauteur des pills (padding vertical et/ou `minHeight`) de ~2-4 px.
- Garder le défilement horizontal par ligne si les catégories débordent sur mobile.

### 2. AgeFilter : pills plus compacts
- Réduire le padding vertical et/ou `minHeight` des pills de ~2 px.
- Conserver le label "Âge :" et le défilement horizontal.

### 3. Header : ajustements d'espacement
- Vérifier que les marges/paddings entre la barre de recherche, CategoryFilter et AgeFilter restent cohérents après réduction.
- Réduire légèrement `pb-3` si besoin pour compenser la double ligne de catégories.

### 4. Vérification visuelle
- Capturer un screenshot mobile de l'Explorer pour valider que les deux lignes de filtres sont lisibles et que l'interface suivante reste visible.