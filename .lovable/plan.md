## Intégrer les illustrations éléphant dans la LevelCard

### 1. Upload des 4 PNG via Lovable Assets (CDN)
Plutôt que de poser les binaires dans `/public/levels/`, je passe par `lovable-assets` (politique projet : ne pas embarquer de gros binaires dans le repo). Les 4 fichiers sont uploadés depuis `/mnt/user-uploads/Niv{1..4}.png` et leurs pointeurs JSON sont écrits dans :
- `src/assets/levels/niv1.png.asset.json`
- `src/assets/levels/niv2.png.asset.json`
- `src/assets/levels/niv3.png.asset.json`
- `src/assets/levels/niv4.png.asset.json`

### 2. Mise à jour de `src/components/LevelCard.tsx`
- Importer les 4 pointeurs en haut du fichier.
- Ajouter un champ `img: string` sur le type `Level` et renseigner `img: niv1Asset.url` … pour chaque entrée de `LEVELS`.
- **Grande image (62×62)** : remplacer le placeholder coloré (`NIV. / id`) par `<img src={current.img} alt={current.name} style={{ width: 62, height: 62, borderRadius: 14, objectFit: 'contain' }} loading="eager" />`. Pas de fond coloré derrière, le dégradé de la carte reste visible.
- **Frise (chips 24×24)** : remplacer la pastille colorée par `<img src={lvl.img} alt="" width={24} height={24} style={{ width: 24, height: 24, objectFit: 'contain' }} />`. Pour le niveau actuel l'image est en pleine opacité ; pour les niveaux futurs (non encore atteints) ajout d'un `opacity: 0.4` + `filter: grayscale(0.4)` pour rester lisible et signaler qu'ils sont verrouillés. Les niveaux passés gardent leur image en pleine opacité (et le ✓ disparaît puisque l'éléphant est l'identité visuelle).
- Conserver la bordure active / fond `rgba(color, 0.12)` du chip courant, qui sert de signal d'état.
- Dimensions fixes (`width`/`height` numériques HTML + `style`) pour éviter le layout shift au chargement.

### 3. Vérification
Une fois en place : rechargement de `/account` à 390×844 et capture d'écran de la carte pour vérifier proportions, lisibilité des chips et cohérence niveau actuel / illustration affichée.

### Hors scope
- Pas de modification de la logique de niveaux ni du fetch profile.
- Pas d'animation supplémentaire.