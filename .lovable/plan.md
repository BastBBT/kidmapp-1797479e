# Fix partage mobile : enregistrement dans la pellicule

## Problèmes constatés
1. **Sur mobile, le bouton "Partager sur Instagram" renvoie direct vers Instagram sans télécharger** : soit `navigator.canShare({files})` est `false`, soit `navigator.share` a échoué/été annulé → on tombe sur le fallback `openInstagram()` + `<a download>` qui ne sauve rien dans la pellicule.
2. **Le bouton "Enregistrer l'image" ne sauve pas dans la pellicule sur mobile** : `<a download>` sur iOS Safari ouvre juste l'image dans un nouvel onglet ; sur Android Chrome ça va dans Downloads, pas dans Photos.

La seule manière fiable d'atterrir dans la pellicule sur mobile, c'est le **share sheet natif** (`navigator.share({ files })`) où l'utilisateur choisit « Enregistrer l'image » / « Save to Photos ».

## Solution

Adapter les deux boutons selon la plateforme via `useIsMobile` + détection de `canShare({files})`.

### `src/components/ShareLevelModal.tsx`

#### Bouton "Enregistrer l'image"
- **Mobile + `canShare({files})` supporté** → appeler `navigator.share({ files: [file], title: 'Mon niveau Kidmapp' })`. L'utilisateur choisit "Enregistrer l'image" dans la share sheet → va dans Photos. Pas de redirection Instagram ici.
- **Sinon (desktop, ou mobile sans Web Share API fichiers)** → comportement actuel `<a download>`.
- Label adapté : sur mobile, "Enregistrer dans Photos" (plus explicite que "l'image"). Sur desktop : "Télécharger l'image".

#### Bouton "Partager sur Instagram"
- **Mobile + `canShare({files})` supporté** → uniquement `navigator.share({ files, title })`. L'utilisateur choisit Instagram (ou "Enregistrer l'image" puis ouvre Insta manuellement). **Aucun fallback automatique vers `instagram://`** ni `<a download>` parallèle — c'était la source du bug.
  - Si l'utilisateur annule (AbortError) → ne rien faire (pas de message d'erreur intrusif).
  - Si `share` rejette pour autre raison → afficher le message fallback mobile.
- **Mobile sans Web Share API fichiers** → afficher un encart visible : « Sur ton mobile, utilise d'abord "Enregistrer dans Photos" ci-dessus, puis ouvre Instagram → Stories. » + bouton secondaire "Ouvrir Instagram" qui fait `window.open('https://www.instagram.com/', '_blank')`.
- **Desktop** → comportement actuel : download du PNG + ouverture nouvel onglet `instagram.com` + message « Image téléchargée ✓ — Termine le partage depuis ton mobile. »

#### Code partagé
- Garder `triggerDownload(href, filename)` pour desktop.
- Nouvelle helper `shareFile(file): Promise<'shared' | 'cancelled' | 'unsupported' | 'error'>` pour centraliser la détection (`canShare` + try/catch sur AbortError).
- Plus de deep link `instagram://story-camera` automatique : trop fragile sur iOS et inutile si la share sheet marche.

### Détails techniques
- Détection mobile : `useIsMobile` déjà importé.
- Détection Web Share API fichiers : utilitaire `canShareFiles(file)` qui check `typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })`.
- Pas de modif de `ShareLevelCard.tsx` ni `LevelCard.tsx`.
- Pas de nouvelle dépendance.

## Hors scope
- Pas de copie presse-papier.
- Pas de tracking.
- Pas de génération côté serveur.
