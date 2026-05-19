## Constat

Le problème ne semble pas venir du bouton Google seul : le double-déclenchement est maintenant protégé dans `AuthModal.tsx`.

Les points suspects restants sont :

1. **Gestion manuelle du callback OAuth dans `useAuth.ts`**
   - Le code intercepte les tokens `access_token` / `refresh_token` dans l’URL.
   - Il appelle ensuite `supabase.auth.setSession()` ou `refreshSession()` manuellement.
   - Or le flux Google Lovable Cloud est déjà géré par `@lovable.dev/cloud-auth-js` + le client auth.
   - Cette double gestion peut créer une course entre :
     - le SDK qui détecte la session dans l’URL,
     - notre `useAuth.ts` qui tente aussi de poser/nettoyer la session,
     - `getSession()` qui peut appliquer `null` trop tôt.

2. **Mode “visiter sans compte”**
   - Il n’y a pas de service worker actif ni de cache offline lourd dans le code.
   - Le manifest rend l’app installable, mais ne devrait pas intercepter `/~oauth`.
   - Le changement “sans connexion” a surtout rendu `/account` public et ajouté l’onboarding localStorage.
   - Ce localStorage ne touche pas directement aux tokens auth, mais il peut afficher une UI non connectée si `useAuth` conclut trop vite que la session est absente.

3. **Deux abonnements auth concurrents**
   - `AuthProvider` écoute `onAuthStateChange`.
   - `RequireAuthProvider` écoute aussi `onAuthStateChange` uniquement pour fermer la modale.
   - Ce n’est probablement pas la cause principale, mais on peut simplifier pour éviter des effets de bord.

## Plan de correction

### 1. Simplifier `useAuth.ts` pour laisser le SDK auth gérer le callback

- Supprimer la logique custom qui lit/nettoie `access_token`, `refresh_token`, `expires_in`, etc. depuis l’URL.
- Supprimer les appels manuels à `setSession()` / `refreshSession()` sur callback OAuth.
- Garder un flux standard :
  - installer `onAuthStateChange` en premier,
  - appeler `getSession()` ensuite,
  - appliquer la session trouvée.

Objectif : éviter que l’app nettoie l’URL ou écrase l’état avant que le SDK ait fini de persister la session.

### 2. Éviter que `getSession()` applique une absence de session trop tôt

- Garder un drapeau de montage pour éviter les mises à jour après démontage.
- Faire en sorte que `getSession()` ne remplace pas une session reçue par `SIGNED_IN`.
- Ne pas conclure “non connecté” tant que l’initialisation auth n’est pas terminée.

Objectif : éviter que l’écran `/account` repasse en mode “Rejoindre Kidmapp” pendant le retour OAuth.

### 3. Simplifier `RequireAuthProvider`

- Remplacer son abonnement direct `supabase.auth.onAuthStateChange` par une réaction au `user` fourni par `useAuth()`.
- Si `user` devient non nul : fermer la modale et rejouer l’action en attente.

Objectif : une seule source de vérité auth dans l’app : `AuthProvider`.

### 4. Vérifier le manifest/offline sans ajouter de service worker

- Conserver le manifest installable.
- Ne pas ajouter de PWA/service worker.
- Confirmer qu’aucun fichier `sw.js`, `service-worker.js`, `VitePWA` ou cache runtime ne peut intercepter OAuth.

Objectif : ne pas créer de nouveau risque sur `/~oauth`.

### 5. Validation attendue

- Le bouton Google ne déclenche qu’un seul flow.
- Après retour Google en production, la session est persistée.
- `/account` affiche le compte connecté au lieu de l’écran “Rejoindre Kidmapp”.
- Le mode “Découvrir sans compte” continue de fonctionner pour les visiteurs non connectés.