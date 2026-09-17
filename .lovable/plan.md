# Rendre les boutons réactifs tout de suite

## Ce qui se passe

La page Explorer affiche 267 lieux d'un coup. Deux choses saturent le téléphone au chargement et à chaque changement de filtre :

1. **Les cartes de lieux arrivent en cascade.** Chaque carte a un délai d'animation de 0,05 s multiplié par son rang : la 267e carte commence son apparition plus de 13 secondes après l'ouverture. Pendant tout ce temps, le téléphone anime en continu et répond mal aux appuis.
2. **La carte (plan) se reconstruit entièrement à chaque petit changement.** Les 267 épingles, leurs icônes et leurs bulles d'info sont recalculées à chaque fois qu'un filtre, une recherche ou un déplacement du plan met à jour l'adresse de la page — et déplacer le plan met justement l'adresse à jour à chaque geste.

C'est ce qui donne la sensation qu'il faut « bouger la page pour réveiller le clic » : l'appui arrive pendant que le téléphone est occupé, et il est perdu.

## Ce qui va changer

- L'apparition des cartes est plafonnée : seules les premières s'animent légèrement, les suivantes s'affichent directement. Plus d'attente de 13 secondes.
- Le plan ne se reconstruit que lorsque la liste des lieux change vraiment, plus à chaque frappe ou changement d'écran.
- Le déplacement du plan n'écrit plus l'adresse de la page en continu : l'écriture est différée d'une demi-seconde après l'arrêt du geste.
- Un recentrage automatique du plan, déclenché au mauvais moment, est corrigé.

Aucun changement visuel volontaire : mêmes écrans, mêmes filtres, mêmes contenus — juste plus de réactivité.

## Détails techniques

`src/components/LocationCard.tsx`
- `transition={{ delay: index * 0.05 }}` → `delay: Math.min(index, 8) * 0.04` (plafond ~0,32 s au lieu de 13 s).

`src/components/MapView.tsx`
- Envelopper l'export dans `React.memo`.
- Mettre en cache les `L.divIcon` par `category|isSelected` (module-level `Map`) au lieu d'en recréer un par marqueur à chaque rendu.
- `FlyToSelected` : déplacer l'appel `map.flyTo` dans un `useEffect` (aujourd'hui exécuté pendant le rendu, effet de bord interdit et rejoué à chaque rendu).
- Mémoïser la liste des `<Marker>` avec `useMemo` sur `locations` / `selectedId`.

`src/pages/Index.tsx`
- `handleMapViewChange` : garder l'écriture de `mapViewRef`, mais débouncer l'appel `updateUrl` (~500 ms, timer nettoyé au démontage) pour éviter un `setSearchParams` — donc un rendu complet de la page et du plan — à chaque `moveend`/`zoomend`.
- Stabiliser les props passées à `MapView` (`locations` déjà mémoïsé via `displayedLocations`, garder `onViewChange` en `useCallback` stable).

## Vérification

Après application : ouvrir Explorer en viewport mobile via Playwright, mesurer que les appuis sur une carte et sur la barre du bas répondent au premier tap sans attendre, et vérifier l'absence d'erreurs console.
