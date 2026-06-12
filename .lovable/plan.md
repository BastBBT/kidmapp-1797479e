# Fix UX partage mobile — Android Chrome en priorité

## Constat

Sur mobile, le bouton "Enregistrer dans Photos" déclenche en fait un téléchargement classique : sur Android Chrome le PNG atterrit dans `Téléchargements` (pas dans la galerie/pellicule), sur iOS Safari il s'ouvre dans un nouvel onglet. C'est trompeur et inutilisable pour poster en story.

Le web n'a aucun moyen d'écrire directement dans la pellicule. La seule voie fiable est la **feuille de partage native** (`navigator.share({ files })`) : l'utilisateur y choisit Instagram (cible principale) ou "Enregistrer l'image" s'il préfère.

## Solution

Sur mobile, on supprime la fausse promesse "Enregistrer dans Photos" et on pousse un parcours unique "Partager" qui ouvre directement la feuille système.

### `src/components/ShareLevelModal.tsx`

**Sur mobile (`useIsMobile === true`)** :
- **Un seul bouton principal** : "Partager mon niveau" (gradient Instagram conservé, icône `Share2`).
  - Capture le canvas → `File` PNG → `navigator.share({ files, title, text: 'Mon niveau Kidmapp 🐘 @kidmapp' })`.
  - Si `canShare({files})` est `true` → ouvre la feuille native (Instagram, Stories, WhatsApp, Enregistrer l'image… au choix de l'utilisateur). C'est le chemin nominal sur Android Chrome récent.
  - Si annulation (`AbortError`) → silencieux.
  - Si erreur ou `canShare({files})` est `false` (vieux Chrome, navigateurs in-app type Facebook/LinkedIn) → fallback : ouvre l'image dans un nouvel onglet (`window.open(blobUrl, '_blank')`) + message "Appui long sur l'image → Enregistrer l'image, puis ouvre Instagram." + bouton secondaire "Ouvrir Instagram".
- **Pas de bouton "Télécharger" séparé sur mobile** : il créait la confusion (fichier vs pellicule). Le partage natif propose déjà "Enregistrer l'image" pour ceux qui veulent.
- Petite ligne d'aide sous le bouton : "Choisis Instagram ou Enregistrer l'image dans le menu" (12.5px, gris).

**Sur desktop** : comportement actuel inchangé (téléchargement PNG + ouverture instagram.com + message "Image téléchargée ✓").

### Hors scope
- Pas de tentative de deep link `instagram://` (cassé sur iOS récent, partage natif sert mieux le cas).
- Pas de copie presse-papier.
- Pas de modif de `ShareLevelCard`, `LevelCard`, ni autre composant.
- Pas de nouvelle dépendance.

## Détails techniques

- Helpers existants réutilisés : `captureBlob`, `shareFile`, `canShareFiles`, `triggerDownload`.
- Le fallback "ouvrir l'image dans un onglet" évite la situation pire (fichier perdu dans Téléchargements sans feedback). L'appui long est un geste connu sur Android pour "Enregistrer l'image" → pellicule.
- État `busy` et `shareNote` conservés. Suppression de l'état `downloaded` côté mobile (plus de bouton download).
