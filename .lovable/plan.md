## Objectif
Remplacer les icônes emoji actuelles des 5 catégories « Activités » (nature, sport, creatif, culture, jeux) par les PNG illustrés fournis, et les propager partout où `CATEGORY_ICONS` est utilisé.

## État actuel
Dans `src/assets/icons.ts`, les 5 activités utilisent `emojiIcon('🌿')`, `'⚽'`, `'🎨'`, `'🏛️'`, `'🎲'` (SVG inline avec emoji). Les catégories « Lieux » (restaurant, cafe, shop, public, coiffeur) utilisent déjà des PNG importés.

`CATEGORY_ICONS` est consommé par : `CategoryFilter`, `LocationCard`, `LocationPage`, `AdminPage`, `AccountPage`, `ActiveCategoryBanner`, `AuthModal`, `ProposeLocationModal`. Aucun changement nécessaire dans ces fichiers — l'update de la source suffit.

## Étapes
1. Créer 5 pointeurs Lovable Assets à partir de `/mnt/user-uploads/{nature,sport,creatif,culture,jeux}.png` → `src/assets/cat-{nature,sport,creatif,culture,jeux}.png.asset.json`.
2. Modifier `src/assets/icons.ts` :
   - Importer les 5 nouveaux pointeurs (via `.asset.json` → `.url`).
   - Remplacer les 5 entrées `emojiIcon(...)` dans `CATEGORY_ICONS` par les URLs des PNG.
   - Retirer le helper `emojiIcon` s'il n'est plus utilisé.
3. Vérifier visuellement dans l'Explorer (barre de catégories) que les 5 nouvelles icônes s'affichent correctement.

## Notes
- Les fichiers uploadés ont un fond blanc → OK, s'affichent tels quels comme les icônes Lieux existantes (rendues à 15×15 dans le filtre, 16×16 dans les cards).
- Aucun impact sur la BDD, l'API, ou les composants consommateurs.