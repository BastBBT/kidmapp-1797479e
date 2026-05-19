## Cohérence icônes illustrées

Remplacer les emojis restants par les icônes PNG illustrées déjà importables depuis `src/assets/icons.ts` (`EQUIP_ICONS`, `CATEGORY_ICONS`, `MEAL_ICONS`).

### 1. `src/components/ContributionModal.tsx` — équipements 24×24
Dans `CriterionToggle`, l'icône est actuellement rendue dans un cercle 32×32 avec un `<img>` 16×16. Passer les `<img>` à **24×24** (cercle inchangé) et retirer le tint `color: var(--primary)` du conteneur pour laisser l'icône colorée s'exprimer (background reste `var(--primary-light)`).

### 2. `src/components/ProposeLocationModal.tsx`
- **Picker catégorie (Step 0)** : remplacer le `<select>` natif (`🍽️ Restaurant`, etc.) par une grille horizontale scrollable de 5 boutons cercle (style aligné avec `CategoryFilter`) : cercle 56×56 avec `CATEGORY_ICONS[cat]` 36×36 + label sous le cercle. État actif = bordure `var(--primary)` 1.5px + fond `var(--primary-light)`. Catégories : restaurant / cafe / shop / public / coiffeur.
- **Équipements (Step 1)** : `ToggleRow` est déjà OK (vignette 30×30 avec icône 22×22). Aligner sur 24×24 pour cohérence avec ContributionModal et garder le fond `#EBF4F2`.

### 3. `src/pages/AccountPage.tsx` — historique
Pour **chaque carte contribution** :
- Ajouter une vignette catégorie **26×26** à gauche (cercle `var(--primary-light)` + `CATEGORY_ICONS[c.locations.category]` 20×20), à côté du nom du lieu.
- Dans les badges équipements, remplacer les emojis `🪑👶🎨🍽️` par `<img src={EQUIP_ICONS.*}>` **14×14** inline (alignés verticalement avec le texte "Oui"/"Non").

Pour **chaque carte proposition** :
- Ajouter la même vignette catégorie 26×26 à gauche du nom (sauf si une photo existe déjà — dans ce cas garder la photo en haut).

### 4. `src/components/AuthModal.tsx` — header
Remplacer le bloc actuel de 4 cercles SVG hand-drawn (lignes 307–332) par une rangée de **5 cercles 42×42** (gap 10px) avec `CATEGORY_ICONS` 26×26 pour : restaurant, cafe, shop, public, coiffeur. Garder fond `rgba(255,255,255,0.78)` + shadow.

### Détails techniques
- Import unique en haut de chaque fichier : `import { EQUIP_ICONS, CATEGORY_ICONS } from '@/assets/icons';`
- `<img>` toujours avec `alt=""` (décoratif) et `objectFit: 'contain'`.
- Aucune modif de logique métier ni de tokens.
- Catégories ordre cohérent partout : restaurant, cafe, shop, public, coiffeur.
