## Objectif
Ajouter un bouton "+ Proposer" bien visible dans la barre de navigation du bas, qui ouvre la modale de proposition de lieu depuis n'importe quelle page, avec gestion du flow de connexion si l'utilisateur n'est pas authentifié. Retirer l'ancien bouton situé dans l'en-tête de la page Explorer.

## Problème technique
La modale `ProposeLocationModal` est actuellement instanciée dans `Index.tsx` (page Explorer). `BottomNav` vit dans `App.tsx`, au-dessus des routes. Pour qu'un clic dans la barre de navigation puisse ouvrir la modale globalement, il faut remonter l'état de la modale au niveau de `AppContent`.

## Fichiers concernés

### 1. Créer `src/hooks/useProposalModal.tsx`
Contexte React minimal pour piloter l'ouverture/fermeture de la modale de proposition depuis n'importe quel composant enfant de `App`.

- Fournit : `isOpen`, `open()`, `close()`.
- `ProposalModalProvider` wrappé autour de `RequireAuthProvider` dans `App.tsx`.

### 2. Modifier `src/App.tsx`
- Importer `ProposalModalProvider` et `useProposalModal`.
- Importer `ProposeLocationModal`.
- Wrap hiérarchie : `ProposalModalProvider` au-dessus de `RequireAuthProvider`.
- Dans `AppContent`, consommer le contexte pour récupérer `isOpen` / `close`.
- Rendre `<ProposeLocationModal open={isOpen} onClose={close} />` en fin de `AppContent` (frère de `<BottomNav />`).

### 3. Modifier `src/components/BottomNav.tsx`
- Ajouter un 4ème onglet `propose` dans le tableau `tabs` :
  - **Label** : "PROPOSER"
  - **Icône** : `+` (croix style plus, en blanc)
  - **Style** : fond plein orange `#D95F3B`, texte et icône en blanc, bord arrondi (pill) pour le différencier visuellement des 3 onglets standards.
- Importer `useProposalModal` et `useRequireAuth`.
- Au clic sur "Proposer" : appeler `requireAuth(() => open(), { message: 'Connecte-toi pour proposer un nouveau lieu à la communauté ✦' })`.
  - Le hook `useRequireAuth` gère déjà automatiquement le replay de l'action après connexion, donc la modale s'ouvrira seule une fois l'utilisateur connecté.
- Le bouton ne déclenche pas de `navigate()` : c'est une action, pas une route.

### 4. Modifier `src/pages/Index.tsx`
- Retirer le bloc "Compteur + Proposer" (garder uniquement le compteur de lieux à gauche, retirer le bouton à droite).
- Retirer l'import de `ProposeLocationModal`.
- Retirer le `useState` de `showProposalModal`.
- Retirer le rendu de `<ProposeLocationModal ... />` en bas du composant.
- Nettoyer les imports inutilisés (`useRequireAuth` si plus utilisé ailleurs dans `Index`).

## Détails visuels du bouton
- **Couleur** : fond `var(--primary)` / `#D95F3B`, texte blanc.
- **Forme** : pill arrondi (`border-radius: 100px`), légèrement surélevé ou en retrait pour le rendre plus visible qu'un simple onglet.
- **Typo** : `font-body text-[10px] uppercase font-semibold tracking-wide` (cohérent avec les autres onglets).
- **Layout** : `justify-around` s'ajuste automatiquement à 4 items.

## Pas de régression
- Le flow de connexion existant (`useRequireAuth`) est réutilisé tel quel.
- Le bouton "Proposer" n'apparaît que dans la bottom nav, plus dans l'en-tête Explorer.
- La modale reste fonctionnelle et fermable comme avant.