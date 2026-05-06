## Diagnostic

La fonction `delete-account` renvoie **500 en ~97 ms**. Cause : l'appel `userClient.auth.getClaims(token)` n'existe pas dans `@supabase/supabase-js@2.45.0` → `TypeError` attrapé par le `catch` → erreur générique côté UI.

## Correctif

### 1. `supabase/functions/delete-account/index.ts`
- Remplacer `getClaims` par `admin.auth.getUser(token)` pour récupérer `userId` et `email`.
- Ajouter `console.log` à chaque étape (log audit, notif admin, cleanup, deleteUser) pour debug futur.
- Étapes :
  1. valider le JWT
  2. insérer dans `account_deletions`
  3. insérer dans `admin_notifications`
  4. supprimer `favorites`, `location_proposals`, `profiles` de l'utilisateur
  5. **garder les `contributions`** (anonymisées via `user_id = NULL`) pour préserver les votes d'équipement
  6. `admin.auth.admin.deleteUser(userId)`
- Retourner un message d'erreur précis si une étape échoue.

### 2. Anonymisation des contributions
Avant de supprimer le profil, faire `UPDATE contributions SET user_id = NULL WHERE user_id = userId` pour conserver l'historique des votes.

### 3. `src/components/DeleteAccountSection.tsx`
- Après succès : `signOut()` puis `navigate('/login')` au lieu de `'/'`.

Aucun changement de schéma DB nécessaire.
