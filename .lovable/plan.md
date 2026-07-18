## Vérification préalable
`CATEGORY_ASSETS` est **local à `src/components/MapView.tsx`** (déclaration + une seule utilisation à la ligne 37). Aucun autre fichier ne l'importe. Le remplacer n'a donc **aucun effet de bord** sur les autres écrans.

Les icônes de lieux sont conservées à l'identique : `CATEGORY_ICONS` dans `src/assets/icons.ts` importe déjà **les mêmes fichiers** que la table locale :
- `restaurant` → `cat-restaurant.png` ✓
- `cafe` → `cat-cafe.png` ✓
- `shop` → `cat-boutique.png` ✓
- `public` → `cat-lieu-public.png` ✓
- `coiffeur` → `cat-coiffeur.png` ✓

Et en plus, les 5 activités (`nature`, `sport`, `creatif`, `culture`, `jeux`) qui manquent aujourd'hui.

## Correction (dans `src/components/MapView.tsx` uniquement)

1. Supprimer la table locale `CATEGORY_ASSETS`.
2. Importer `CATEGORY_ICONS` depuis `@/assets/icons`.
3. Remplacer `CATEGORY_ASSETS[category] ?? CATEGORY_ASSETS.restaurant` par `CATEGORY_ICONS[category] ?? CATEGORY_ICONS.restaurant`.
4. Ajouter dans `configs` les 5 couleurs manquantes pour les pastilles :
   - `nature` → vert `#3B7D6E`
   - `sport` → bleu `#3B6EB0`
   - `creatif` → violet `#8E44AD`
   - `culture` → doré `#B7791F`
   - `jeux` → corail `#D95F3B`

Les icônes de **lieux restent strictement identiques** (mêmes PNG, mêmes couleurs de pastilles). Seules les activités passent d'un fallback « icône restaurant » à leur vraie icône.

## Vérification post-fix

- Recharger la carte avec `?category=nature` → doit afficher l'icône plante verte.
- Vérifier restaurant/cafe/shop/public/coiffeur → aucun changement visuel attendu.