## Objectif

Retirer le bouton "Continuer avec Apple" du modal d'authentification web. Le Sign in with Apple restera disponible uniquement dans l'app iOS native (via Capacitor), où le flow ne passe pas par ce modal.

## Modifications (un seul fichier : `src/components/AuthModal.tsx`)

1. Supprimer le bloc JSX du bouton Apple (lignes ~511-537).
2. Supprimer le handler `handleAppleSignIn` (lignes ~222-237).
3. Supprimer l'état `appleLoading` (ligne ~201).
4. Supprimer le composant `AppleIcon` (ligne ~11) devenu inutilisé.
5. Nettoyer l'import de `lovable` s'il n'est plus utilisé ailleurs dans le fichier (à vérifier — Google passe probablement par le même import, donc à conserver dans ce cas).

## Hors périmètre

- Aucune modification de `src/integrations/lovable/index.ts` (toujours utilisé par Google et par le flow iOS natif).
- Aucune modification de la config Supabase / Apple Developer (le provider Apple reste activé côté backend pour le flow natif iOS via `signInWithIdToken`).
- Aucun changement sur le code Capacitor iOS.
