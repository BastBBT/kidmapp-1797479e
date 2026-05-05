## Problème

Sur mobile, les libellés des chips de filtres (catégories + types de repas) sont tronqués. De plus, la rangée "type de repas" colle visuellement à celle des catégories.

## Solution

Restaurer une taille de chip plus généreuse pour que les libellés tiennent en entier, et harmoniser les deux rangées (catégories + repas) avec un style identique. Ajouter un peu d'espace au-dessus de la rangée "type de repas".

### Changements

**1. `src/components/CategoryFilter.tsx`**
- Padding chip : `px-3.5 py-2` (au lieu de `px-3 py-1.5`)
- Taille texte : `text-sm` (14px, au lieu de 13px)
- Icône catégorie : 16px (au lieu de 18px) pour équilibrer avec le texte plus grand
- Gap inchangé : `gap-1.5`

**2. `src/components/MealFilter.tsx`**
- Aligner exactement sur CategoryFilter : `padding: 8px 14px`, `font-size: 14px`, icône 16px, `gap: 6px`, `border-radius: 100px`
- Container : ajouter un padding top pour aérer → `padding: 10px 16px 8px` (au lieu de `0 16px 8px`)

### Résultat attendu

- Sur mobile (≤ 402px), les libellés "Restaurant", "Boutique", "Lieu public", "Goûter", "Petit déj"… s'affichent en entier.
- Les deux rangées partagent exactement la même hauteur, typographie et densité.
- Un espace clair sépare la rangée des catégories de celle des types de repas.

### Vérification

Après implémentation, screenshot du viewport mobile (≈ 402×716) pour confirmer qu'aucun chip n'est tronqué et que l'espacement vertical est harmonieux.