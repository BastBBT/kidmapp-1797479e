## App accessible sans connexion + actions différées

Rendre Kidmapp navigable sans compte. La connexion ne sera demandée que pour les actions et pages qui en ont strictement besoin, et l'action que l'utilisateur essayait de faire sera rejouée automatiquement après login.

### 1. Routes publiques vs protégées (`src/App.tsx` + `src/components/AuthGate.tsx`)

- Routes **publiques** (pas d'auth requise) : `/`, `/location/:id`, `/privacy`, `/support`, `*` (NotFound).
- Routes **protégées** (auth requise — redirige vers AuthModal si pas connecté) : `/saved`, `/gestion-k1dm4p`.
- Route **spéciale** : `/account` — toujours accessible, mais affiche une vue "Rejoindre Kidmapp" quand non-connecté (pas de redirection).
- `AuthGate` devient un wrapper réutilisable qui prend les routes protégées en enfants, sans bloquer le reste.
- L'onboarding (premier passage) reste affiché aux nouveaux visiteurs non-connectés, mais avec un nouveau bouton "Découvrir sans compte" en plus de Se connecter / Créer un compte.
- `BottomNav` doit s'afficher pour **tous** les utilisateurs (connectés ou non) — actuellement conditionné à `!!user`.

### 2. Système d'action différée (nouveau hook + contexte)

Créer `src/hooks/useRequireAuth.tsx` exposant :
- Un `RequireAuthProvider` au-dessus de l'app
- Un hook `useRequireAuth()` qui retourne `requireAuth(action: () => void, opts?: { message?: string })`
- Si l'utilisateur est connecté → exécute l'action immédiatement.
- Sinon → stocke l'action en mémoire (ref) + un message contextuel ("Connecte-toi pour liker ce lieu", etc.), puis ouvre `AuthModal` en mode signup.
- Après login réussi (via `onAuthStateChange` SIGNED_IN), rejouer l'action stockée puis la nettoyer.

L'`AuthModal` actuel est ouvert par `AuthGate` lorsqu'il n'y a pas de user. Pour le cas "action protégée depuis route publique", il faut une seconde instance contrôlée par le provider — montée en haut de l'app, fermable, avec un message d'intro personnalisable.

### 3. Points d'appel à protéger

Remplacer les appels directs par `requireAuth(() => ...)` :
- `src/pages/LocationPage.tsx` (ligne ~152) : bouton favori → `requireAuth(() => toggleFavorite.mutate(location.id), { message: "Connecte-toi pour sauvegarder ce lieu" })`.
- `src/components/LocationCard.tsx` : si un bouton favori existe sur la carte (à vérifier), même traitement.
- `src/components/ContributeSheet.tsx` (ouverture depuis `LocationPage`) : protéger le déclencheur d'ouverture.
- `src/components/ContributionModal.tsx` : idem (déclencheur d'ouverture).
- `src/pages/Index.tsx` (ligne ~309) : bouton "Proposer un lieu" → `requireAuth(() => setShowProposalModal(true), { message: "Connecte-toi pour proposer un lieu" })`.

Les modals/sheets eux-mêmes restent inchangés (ils supposent un user existant, ce qui est garanti après login).

### 4. Vue "Rejoindre Kidmapp" sur `/account`

Dans `src/pages/AccountPage.tsx`, ajouter un early return quand `!user` :
- Même hero coloré (dégradé corail/crème, blob SVG).
- Titre Fraunces "Rejoindre Kidmapp", sous-titre Caveat "Sauvegarde tes lieux préférés, contribue, et plus encore ✦".
- Liste de 3-4 bénéfices avec emojis : ❤️ Sauvegarder tes favoris · ✍️ Contribuer aux infos · 📍 Proposer un nouveau lieu · 👤 Suivre ton activité.
- CTA primaire "Se connecter" (ouvre l'AuthModal du provider en mode login).
- CTA secondaire texte "Créer un compte" (ouvre AuthModal en mode signup).
- Footer Confidentialité · Support · © 2026 conservé.

### 5. Détails techniques

- Le provider expose aussi `openAuthModal(mode: 'login' | 'signup', message?)` utilisé par la vue Compte.
- L'action stockée est une `useRef<() => void>` pour éviter les re-renders et le state stale.
- Nettoyer l'action si l'utilisateur ferme le modal sans se connecter.
- `useFavorites` reste tel quel (déjà `enabled: !!user`) — pas d'appel Supabase tant que pas connecté, et `isFavorite()` retourne `false` par défaut. ✓
- L'AuthModal existant doit accepter une nouvelle prop optionnelle `onClose` et `headerMessage` (le bandeau contextuel "Connecte-toi pour…"). Quand monté par `AuthGate` (route protégée), il reste non-fermable comme aujourd'hui ; quand monté par `RequireAuthProvider`, il est fermable.

### Hors scope
- Aucune migration DB ni changement RLS (les policies actuelles sont déjà correctes : SELECT publié → public, mutations → authenticated).
- Pas de changement sur le flux Apple/Google.
- Pas de modification de l'admin URL.
