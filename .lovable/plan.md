## Objectif

Transformer la "bannière" de filtre actif en une simple pastille (pin) compacte, placée sous la rangée de filtres repas (beige, brunch, etc.), au lieu d'être collée sous les pills de catégorie dans le header.

## Changements

### 1. `src/components/ActiveCategoryBanner.tsx` — restyler en pin

- Supprimer le conteneur pleine largeur (plus de `justify-content: space-between` qui étire la pastille sur toute la largeur).
- Rendre la pastille `display: inline-flex`, alignée à gauche, avec uniquement le contenu (icône + label + ×) — donc largeur intrinsèque, comme une pill de catégorie.
- Garder les couleurs par catégorie (bg + bordure + texte), le border-radius arrondi, la transition d'apparition (opacity + max-height 200ms).
- Wrapper extérieur conserve le padding horizontal (`16px`) et un petit padding vertical pour respirer sous le MealFilter.

### 2. `src/components/Header.tsx` — retirer la bannière du header

- Supprimer l'import et le rendu de `<ActiveCategoryBanner />`.
- Le header se termine donc après la rangée CategoryFilter.

### 3. `src/pages/Index.tsx` — afficher la pastille sous le MealFilter

- Importer `ActiveCategoryBanner`.
- L'insérer juste après le bloc `MealFilter` (ligne ~152), avant le compteur "X lieux trouvés".
- Lui passer `category={selectedCategory}` et `onClear={() => setSelectedCategory('all')}`.

## Résultat visuel attendu

```
[ Logo ............ Avatar ]
[ Search ........................ ]
[ 🍽 Restaurant  ☕ Café  🛍 …  ] (pills catégorie)
─────────────────────────────────
[ 🥐 Brunch  🍰 Goûter  …       ] (MealFilter, si resto/café)
[ ● Restaurant  ×  ]               ← pastille filtre actif (compacte, alignée à gauche)
[ 12 lieux trouvés      + Proposer ]
```

Aucun changement de logique métier — uniquement présentation et emplacement.
