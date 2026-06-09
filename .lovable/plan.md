# Améliorer « Partager sur Instagram » (desktop + Chrome mobile)

## Problème
- **Chrome desktop** : `navigator.canShare({ files })` renvoie `false` → seule une petite note discrète s'affiche.
- **Chrome mobile (Android)** : même quand le partage natif marche, Instagram n'apparaît pas toujours dans la share sheet pour des fichiers PNG, ou l'utilisateur annule et n'a rien de concret pour finir le partage.

Dans les deux cas, l'utilisateur reste bloqué sans image utilisable.

## Solution

Toujours **garantir que l'image atterrit chez l'utilisateur**, puis proposer une route directe vers Instagram.

### `src/components/ShareLevelModal.tsx`

Refondre `handleInstagram` :

1. Capturer le canvas → `Blob` → `File('mon-niveau-kidmapp.png')`.
2. **Toujours déclencher le téléchargement du PNG** en arrière-plan (créer un `<a download>` avec un `URL.createObjectURL(blob)`, le cliquer, puis révoquer l'URL). C'est silencieux et garantit que l'image existe sur l'appareil.
3. **Si `navigator.canShare?.({ files: [file] })`** : appeler `navigator.share({ files: [file], title: 'Mon niveau Kidmapp' })`. Si l'utilisateur annule (catch silencieux) → on retombe sur le message ci-dessous.
4. **Sinon** : ouvrir Instagram dans un nouvel onglet.
   - Desktop → `https://www.instagram.com/`
   - Mobile → tenter le deep link `instagram://story-camera` via `window.location.href`, avec fallback `https://www.instagram.com/` après 800ms si l'app n'est pas installée (timer annulé si la page perd le focus).
   - Détection mobile via `useIsMobile` déjà présent dans le projet.
5. Afficher un encart visible (remplaçant la note discrète actuelle) sous les boutons :
   - **Mobile** : « Image enregistrée dans ta galerie ✓ — Ouvre Instagram → Stories → ajoute-la depuis ta galerie. »
   - **Desktop** : « Image téléchargée ✓ — Instagram s'ouvre dans un nouvel onglet. Termine le partage depuis ton mobile. »
   - Style : fond `#FFF8F5`, bordure `1px solid rgba(217,95,59,0.2)`, padding 12, border-radius 12, fontSize 12.5, texte centré, couleur `var(--text)`.

### Détails techniques
- Pas de nouvelle dépendance.
- Pas de modif de `ShareLevelCard.tsx` ni de `LevelCard.tsx`.
- Garder le label « Partager sur Instagram » + dégradé Instagram du bouton.
- Mutualiser la logique de download : extraire une petite fonction `triggerDownload(blob | dataUrl, filename)` interne au composant, réutilisée par `handleDownload` et `handleInstagram`.
- `setBusy(false)` toujours appelé dans le callback `toBlob`, y compris en cas d'erreur.

## Hors scope
- Pas de copie presse-papier.
- Pas de QR code.
- Pas de tracking analytics.
- Pas de modif du flow « Enregistrer l'image » (inchangé).
