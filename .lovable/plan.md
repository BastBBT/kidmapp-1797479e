## Bandeau "Télécharge l'app iOS" pour iPhone

Ajout d'un bandeau discret en haut de la webapp pour proposer l'app iOS native aux utilisateurs sur iPhone Safari.

### Détection

- iPhone via `navigator.userAgent`
- Exclu si déjà installé en PWA standalone (`navigator.standalone` ou `display-mode: standalone`)
- Exclu si fermé il y a moins de 7 jours (localStorage)

### Design

Style smart banner iOS adapté au design system Kidmapp (cream/coral, Fraunces/DM Sans) :

```text
┌──────────────────────────────────────────────┐
│ ×  [🐘icone] Kidmapp                [Ouvrir] │
│            Disponible sur l'App Store        │
└──────────────────────────────────────────────┘
```

- Hauteur ~64px, en haut de la page (pousse le contenu, pas fixed → le Header sticky reste sous lui en flow)
- Fond `var(--primary-light)` + bordure basse
- **Icône** : l'éléphant orange au casque jaune fourni → uploadé via `lovable-assets` puis affiché en carré arrondi 44px
- Titre "Kidmapp" en Fraunces 15px + sous-titre "Disponible sur l'App Store" DM Sans 12px muted
- Bouton "Ouvrir" : pill coral 13px → `https://apps.apple.com/fr/app/kidmapp/id6763571262` (target `_blank`, `rel="noopener"`)
- Croix de fermeture (×) à gauche, discrète

### Comportement

- localStorage clé `kidmapp_iosBannerDismissedAt` (timestamp)
- Réapparition après 7 jours
- Visible sur toutes les pages, masqué naturellement quand l'onboarding fullscreen est ouvert (z-index 2000 par dessus)

### Fichiers

**Nouveau** :
- `src/assets/ios-app-icon.png.asset.json` — pointeur CDN vers l'éléphant uploadé
- `src/components/IosAppBanner.tsx` — composant + détection iPhone/standalone/dismissed, retourne `null` sinon

**Modifié** :
- `src/App.tsx` — ajout `<IosAppBanner />` dans `AppContent`, juste avant `<Routes>`

### Détails techniques

- Aucune dépendance ajoutée, aucun changement backend
- iPad volontairement exclu (l'app cible iPhone)
- Image servie via le CDN Lovable Assets (pas de binaire dans le repo)
