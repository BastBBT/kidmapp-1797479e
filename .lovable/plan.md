## Problème

Le bouton "Continuer avec Google" dans `src/components/AuthModal.tsx` peut déclencher deux flows OAuth en parallèle (double-tap rapide, double event, ou re-render). Bien que le bouton soit `disabled={googleLoading}`, le handler `handleGoogleSignIn` ne vérifie pas l'état avant de lancer `lovable.auth.signInWithOAuth`, donc deux appels peuvent partir avant que React applique le `disabled`. Résultat : deux `state` OAuth différents, race condition, session non créée en prod.

## Correction

Un seul fichier touché : `src/components/AuthModal.tsx`, fonction `handleGoogleSignIn` (lignes ~200-216).

1. Utiliser un **ref** (`useRef<boolean>`) en plus du state `googleLoading`, pour bloquer **synchronement** un second appel — un state React n'est pas mis à jour avant le prochain render et ne protège donc pas contre les clics rapprochés.
2. Au début du handler : `if (googleLockRef.current) return;` puis `googleLockRef.current = true`.
3. Conserver `setGoogleLoading(true)` pour l'UI (spinner + bouton désactivé visuellement).
4. Ne **pas** relâcher le lock en cas de succès (`result.redirected`) : la page va être rechargée par le redirect OAuth.
5. Relâcher le lock (`googleLockRef.current = false` + `setGoogleLoading(false)`) uniquement dans les branches d'erreur (`result.error`, `catch`).
6. Garder le `disabled={googleLoading}` existant sur le bouton.

## Détails techniques

```text
handleGoogleSignIn:
  if (googleLockRef.current) return         ← garde synchrone
  googleLockRef.current = true
  setGoogleLoading(true)
  try:
    result = await lovable.auth.signInWithOAuth('google', { redirect_uri })
    if result.error:
      setError(...)
      googleLockRef.current = false
      setGoogleLoading(false)
    // succès → on ne relâche rien, le navigateur redirige
  catch err:
    setError(...)
    googleLockRef.current = false
    setGoogleLoading(false)
```

Aucun changement dans `useAuth.ts`, `src/integrations/lovable/index.ts`, ou ailleurs. Aucun changement de logique métier ni de design.
