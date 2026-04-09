

## Ajouter la catégorie "coiffeur"

### Fichiers à modifier

**1. `src/types/location.ts`**
- Ajouter `'coiffeur'` au type `LocationCategory`
- Ajouter l'entrée dans `categoryLabels` : `coiffeur: 'Coiffeur'`
- Ajouter l'entrée dans `categoryIcons` : `coiffeur: '✂️'`

**2. `src/components/CategoryFilter.tsx`**
- Ajouter `'coiffeur'` dans le tableau `categories`
- Ajouter un cas `'coiffeur'` dans le switch `CategoryIcon` avec une icône SVG ciseaux

**3. `src/components/MapView.tsx`**
- Ajouter une entrée `coiffeur` dans `configs` de `getMarkerIcon` (couleurs dédiées, ex. violet/mauve)
- Ajouter `coiffeur: 'Coiffeur'` dans le `categoryLabels` local

**4. `src/components/LocationCard.tsx`**
- Ajouter `coiffeur` dans `categoryGradients`

**5. `src/pages/LocationPage.tsx`**
- Ajouter `coiffeur` dans `categoryGradients`

**6. `src/pages/AdminPage.tsx`**
- Ajouter `<option value="coiffeur">✂️ Coiffeur</option>` dans les 2 selects (ajout + édition)

**7. `src/components/ProposeLocationModal.tsx`**
- Ajouter `<option value="coiffeur">✂️ Coiffeur</option>` dans le select du formulaire de proposition

### Palette couleur pour "coiffeur"
- Stroke/accent : `#9B59B6` (violet)
- Background clair : `#F3EAF7`
- Border : `#D7BDE2`
- Gradient carte : `linear-gradient(145deg, #D7BDE2, #9B59B6)`

### Pas de migration DB nécessaire
La colonne `category` est de type `text`, pas un enum SQL — aucune migration requise.

