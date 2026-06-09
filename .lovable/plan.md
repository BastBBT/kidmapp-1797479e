# Partage visuel du niveau Kidmapp

## Objectif
Au clic sur "Partager mon niveau" dans la `LevelCard`, ouvrir une modale présentant une carte visuelle 300×300 du niveau, téléchargeable en PNG et partageable vers Instagram Stories (mobile).

## Architecture

Deux nouveaux composants + modif minimale de `LevelCard.tsx` :

```
src/components/
├── LevelCard.tsx          ← modifié (bouton ouvre la modale)
├── ShareLevelCard.tsx     ← nouveau (visuel 300×300 à capturer)
└── ShareLevelModal.tsx    ← nouveau (modale + boutons + logique)
```

## Détails techniques

### Dépendance
- `html2canvas` (à installer via `bun add html2canvas`)

### `ShareLevelCard.tsx`
Composant pur visuel, props : `level`, `points`.
- Container 300×300, `borderRadius: 20`, dégradé du niveau (mêmes couleurs que `LEVELS.bgFrom/bgTo` de LevelCard).
- Centré vertical : image éléphant 150×150 (assets `niv1..niv4`).
- Nom niveau Fraunces 22 bold, points DM Sans 15 semi-bold en couleur `level.color`.
- Footer bas : favicon Kidmapp (`/favicon.ico` ou asset existant) + `kidmapp.app` 11px muted.
- Exporté avec `forwardRef` pour permettre la capture html2canvas.

### `ShareLevelModal.tsx`
Utilise `Dialog` (shadcn) sur desktop, `Sheet side="bottom"` sur mobile (via `useIsMobile`). Fond blanc, `borderRadius: 20`.

Contenu :
1. `<ShareLevelCard ref={cardRef} ... />` centrée (non interactive, `pointer-events: none`).
2. Tagline `"Partage ton niveau sur Instagram"` (Fraunces 18).
3. Sous-titre `"N'oublie pas de nous taguer @kidmapp 🐘"` (DM Sans 13 muted).
4. Bouton **"Enregistrer l'image"** :
   - `html2canvas(cardRef.current, { scale: 2, backgroundColor: null })` → `toDataURL('image/png')` → `<a download>`.
   - Style coral `#D95F3B`, label devient `"Image téléchargée ✓"` vert pendant 2s.
5. Bouton **"Partager sur Instagram"** :
   - Convertit canvas → `Blob` → `File('mon-niveau-kidmapp.png')`.
   - Si `navigator.canShare?.({ files: [file] })` → `navigator.share({ files: [file], title: 'Mon niveau Kidmapp' })`.
   - Sinon affiche une note discrète sous le bouton : `"Sur mobile : Instagram → Stories → ajoute depuis ta galerie"`.
   - Style dégradé Instagram `linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)`.
6. Fermeture : croix top-right (déjà incluse dans Dialog/Sheet) ou clic overlay.

### Modif `LevelCard.tsx`
- Ajouter un état `shareOpen`.
- Le bouton "Partager mon niveau" existant : remplacer `handleShare` par `setShareOpen(true)`.
- Calculer le `currentLevel` reste local ; on passe `{ level: current, points }` à la modale.
- Suppression de l'ancien `navigator.share(text)` (remplacé par la modale).

## Points d'attention
- `html2canvas` capture des polices Google Fonts : s'assurer que Fraunces / DM Sans sont déjà chargées avant le clic (elles le sont, utilisées partout dans l'app).
- `scale: 2` produit un PNG 600×600 net pour Stories.
- Image éléphant servie via `/__l5e/...` (CORS OK car même origine du preview), passer `useCORS: true` par sécurité.
- Modale : `z-index: 1000` conforme aux conventions du projet.

## Hors scope
- Pas de tracking analytics du partage.
- Pas de génération côté serveur (purement client html2canvas).
- Pas de modification des assets éléphants existants.
