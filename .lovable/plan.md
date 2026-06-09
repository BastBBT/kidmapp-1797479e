## Composant LevelCard sur la page Mon compte

### 1. Fetch des points
**`src/hooks/useAuth.ts`** — étendre la `Profile` interface avec `points: number`, ajouter `points` dans le `select` de `fetchProfile`, exposer dans le state. Le points est rechargé automatiquement via `refreshProfile` après une action.

### 2. Constantes & helpers (dans le composant LevelCard)
- Tableau `LEVELS` avec les 4 niveaux (Explorateur 0-24, Contributeur 25-74, Guide Kidmapp 75-149, Ambassadeur 150-500), chacun avec `color`, `bgFrom`, `bgTo`.
- Helpers `getCurrentLevel`, `getNextLevel`, `getProgressPercent`.

### 3. Nouveau composant `src/components/LevelCard.tsx`
Props : `points: number`.

Structure :
1. **Header** : placeholder coloré 62×62 radius 14 à gauche (cercle `bgFrom` + lettre `Niv.X` du niveau en `color`) + à droite : nom du niveau (Fraunces 18px), sous-titre "N points accumulés" (DM Sans 13px muted), barre de progression 7px avec fill dégradé `color`, sous la barre 2 labels : seuil actuel à gauche, "+X pts → NextLevel" à droite.
   - Si Ambassadeur : barre à 100%, à la place des labels → "🏆 Niveau maximum atteint !" centré.
   - Si 0 pt : afficher "+25 pts pour devenir Contributeur".
2. **Frise 4 niveaux** : 4 chips égaux (grid 1fr×4), petite pastille ronde 24×24 (initiale du niveau), nom (12px), seuil "0+ pts" (10px muted). Le chip actif a `background: rgba(color, 0.12)` + `border: 1.5px solid color`. Les chips précédents montrent ✓.
3. **Accordéon "Comment gagner des points ?"** : bouton avec chevron Lucide qui pivote 180° (animation 0.2s), 3 lignes :
   - +10 pts • Contribution validée
   - +5 pts • Premier sur un lieu
   - +25 pts • Proposition approuvée
   Pills colorées dans la couleur du niveau actuel.
4. **Bouton partage** : texte muted "↗ Partager mon niveau" centré. Au clic → `navigator.share({ text: "Je suis [Niveau] sur Kidmapp avec [N] points ! 🐘 https://kidmapp.app" })` avec fallback `navigator.clipboard.writeText` + toast (utiliser `useToast`).

Style global : container `background: linear-gradient(135deg, bgFrom, bgTo)`, `border-radius: 18px`, `border: 1.5px solid rgba(color, 0.12)`, `box-shadow: 0 2px 8px rgba(0,0,0,0.04)`, padding 16px, sections séparées par `border-top: 1px solid rgba(color, 0.1)`.

### 4. Intégration `src/pages/AccountPage.tsx`
- Importer `LevelCard`.
- L'insérer entre le bloc Stats (`/* Stats */`) et le bloc Prénom (`/* Prénom */`), wrappé dans `<div style={{ padding: '20px 16px 0' }}>`.
- Ne pas afficher si `profile?.points === undefined`.

### Hors scope (étape 3)
- Pas d'images éléphant (placeholders pour l'instant).
- Pas d'écriture en base, pas de logique admin.