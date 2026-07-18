## Problème constaté

Quand un utilisateur crée un compte :
- `signUp()` réussit silencieusement — pas de session créée (confirmation email requise)
- L'utilisateur ne voit **rien** : pas de message « Vérifie ta boîte mail », pas de feedback
- Les logs auth montrent aussi des erreurs `429 over_email_send_rate_limit` (limite horaire GoTrue atteinte)
- Les erreurs `email_not_confirmed` lors de tentatives de login ne sont pas traduites

## Ce que je vais faire

### 1. Écran de confirmation après signup (`src/components/AuthModal.tsx`)
Après `signUp()` réussi, afficher un état de succès dans la modal :
- Icône check + titre « Vérifie ta boîte mail »
- Message : « On t'a envoyé un lien de confirmation à **{email}**. Clique dessus pour activer ton compte. Pense à vérifier tes spams. »
- Bouton « Renvoyer l'email » (via `supabase.auth.resend({ type: 'signup', email })`) avec cooldown 30s
- Bouton « Retour » pour revenir au formulaire

### 2. Meilleurs messages d'erreur FR
Compléter le mapping des erreurs dans `handleSubmit` :
- `Email not confirmed` → « Ton compte n'est pas encore activé. Vérifie ta boîte mail (et les spams). »
- `over_email_send_rate_limit` / `For security purposes` → « Trop de tentatives, réessaie dans quelques minutes. »
- `Email rate limit exceeded` → même message

### 3. Relever la limite d'envoi auth
Appeler `supabase--configure_auth` avec `rate_limit_email_sent: 100` (actuellement au défaut bas ~4/h) pour éviter les 429 lors des pics d'inscriptions.

## Hors scope
- Pas de changement backend (les templates auth email et le hook fonctionnent déjà — les logs montrent `Hook ran successfully`)
- Pas de modification de `useAuth.ts` (l'appel `signUp` reste identique)
- Pas de changement du flux OAuth Google
