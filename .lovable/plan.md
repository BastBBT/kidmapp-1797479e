## Contexte

Sur `kidmapp.app`, après le callback Google, le navigateur atterrit sur `https://kidmapp.app/#access_token=...&refresh_token=...&token_type=bearer`. Les tokens sont bien là, mais la session Supabase n'est jamais établie. Sur la preview `*.lovable.app`, ça marche.

## Diagnostic

Le flow OAuth managé par Lovable Cloud passe normalement par un broker (`/~oauth/initiate` → Google → `/~oauth/callback`) intercepté par le proxy Lovable. Le SDK `@lovable.dev/cloud-auth-js` récupère ensuite les tokens en JSON et appelle `supabase.auth.setSession(tokens)` — sans jamais exposer les tokens dans l'URL.

Le fait qu'on voie les tokens dans le fragment d'URL sur `kidmapp.app` veut dire que **le callback du broker n'a pas été intercepté** sur le domaine custom : la redirection finit directement sur `window.location.origin` avec les tokens en hash, et personne ne les consomme côté client.

Deux problèmes en parallèle :
1. **Cause racine (platform)** : sur le domaine custom, le proxy Lovable ne semble pas intercepter `/~oauth/callback` correctement → à signaler au support Lovable / vérifier la config du custom domain.
2. **Symptôme côté app** : aujourd'hui le code ne sait pas récupérer une session quand les tokens arrivent en hash, donc même si le broker se rétablit demain on n'a pas de filet.

## Contraintes

- `src/integrations/supabase/client.ts` est auto-généré : **interdiction de le modifier** (donc pas de `detectSessionInUrl`, `flowType`, etc. à toucher là-dedans).
- `src/integrations/lovable/index.ts` est auto-généré aussi : on ne touche pas.
- On reste donc en application code uniquement.

## Fix proposé (filet de sécurité côté app)

Ajouter au montage de l'app un petit handler qui :

1. Lit `window.location.hash`.
2. S'il contient `access_token` + `refresh_token` (cas OAuth implicit / fragment), appelle `supabase.auth.setSession({ access_token, refresh_token })`.
3. Si setSession réussit, nettoie l'URL avec `history.replaceState` pour retirer les tokens du fragment (et éviter qu'ils traînent dans l'historique).
4. Si une erreur est renvoyée dans le fragment (`error=...&error_description=...`), l'afficher via un toast et nettoyer l'URL.

Ce handler est tolérant : si le hash ne contient pas de tokens, il ne fait rien. Donc aucun impact sur le flow normal (mode offline, navigation publique, broker fonctionnel sur la preview, etc.).

### Implémentation

Nouveau hook ou effet placé dans `AuthProvider` (`src/hooks/useAuth.ts`), exécuté **une seule fois** avant de souscrire à `onAuthStateChange` :

```ts
// pseudo-code
useEffect(() => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const error = params.get('error_description') || params.get('error');

  if (access_token && refresh_token) {
    supabase.auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (!error) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      });
  } else if (error) {
    // afficher l'erreur via toast existant
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}, []);
```

`onAuthStateChange` recevra ensuite l'évènement `SIGNED_IN` normalement et la suite du code (fetch profile, etc.) ne change pas.

### Ce qu'on **ne fait pas**

- Pas de modif de `client.ts` (auto-généré).
- Pas de bascule sur un autre flow OAuth (Lovable gère).
- Pas de changement du bouton Google ni du modal.
- Pas de changement de la logique offline / `useRequireAuth`.

## Test

1. Sur `https://kidmapp.app`, cliquer « Continuer avec Google » → vérifier qu'après le retour Google la session est bien créée (badge user dans `/account`, plus de tokens dans l'URL).
2. Sur la preview, vérifier que rien ne casse (le broker fournit directement la session, le handler n'a rien à faire).
3. Vérifier que la navigation publique sans connexion (mode offline) fonctionne toujours.

## Suivi platform

En parallèle, signaler à Lovable que le proxy `/~oauth/callback` ne semble pas intercepté sur `kidmapp.app` / `www.kidmapp.app` — le filet ci-dessus est un workaround, pas la solution propre.

## Question avant d'implémenter

Tu confirmes que le custom domain `kidmapp.app` est bien actif/configuré côté Lovable (DNS OK, statut « actif ») ? Si oui, j'implémente le filet de sécurité tel que décrit.
