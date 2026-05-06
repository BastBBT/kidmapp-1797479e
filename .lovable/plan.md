## Contexte

- Sign in with Apple **fonctionne en natif iOS** (logs auth Supabase confirment des `login` `provider: apple` réussis avec `grant_type: id_token`).
- Sur le **web**, Apple s'ouvre, l'utilisateur s'authentifie, puis ça échoue au retour.
- Tu viens de passer en **BYOC** (Use your own credentials) chez Supabase et d'ajouter `bastienboubat.Kidmapp` (Bundle ID iOS) + ton Services ID web séparés par une virgule.

## Cause la plus probable

Les deux flows n'utilisent **pas le même chemin** :

```text
iOS natif   →  id_token Apple (aud = bastienboubat.Kidmapp)  →  Supabase /token
Web         →  lovable.auth.signInWithOAuth("apple")
            →  Broker oauth.lovable.app
            →  Apple (avec un client_id Services ID)
            →  Callback Supabase /auth/v1/callback
```

Tant que tu étais en mode **managé Lovable**, le broker utilisait *son* Services ID + sa redirect URL côté Apple, et Supabase acceptait le token. En basculant en **BYOC**, Supabase valide désormais `aud` contre **tes** Client IDs et la redirect URL contre **ta** config Apple. Si l'un des deux ne correspond pas à ce que le broker Lovable envoie, le retour casse côté web alors que iOS continue de fonctionner (il ne passe pas par le broker).

## Plan de diagnostic

1. **Récupérer le message d'erreur exact**
   - Ouvrir la console du navigateur sur kidmapp.app, retenter le sign in Apple, noter l'URL de retour et tout message (ex: `error=invalid_request`, `error=server_error`, `?error=...` dans l'URL, ou un toast côté app).
   - Regarder en parallèle les logs auth Supabase au moment du clic pour voir si `/callback` reçoit bien la requête et avec quel statut.

2. **Vérifier la config Apple Developer du Services ID web**
   - Le Services ID doit avoir, dans **Sign In with Apple → Configure** :
     - **Domains and Subdomains** : `rcwepnqjyowlbtmltwxo.supabase.co` (et idéalement `kidmapp.app`, `www.kidmapp.app`, `kidmapp.lovable.app`).
     - **Return URLs** : `https://rcwepnqjyowlbtmltwxo.supabase.co/auth/v1/callback`.
   - Le Services ID doit être lié au **même Primary App ID** que le Bundle ID `bastienboubat.Kidmapp`, et cet App ID doit avoir la capability **Sign In with Apple** activée.

3. **Vérifier la config Supabase BYOC (Cloud → Users → Auth → Apple)**
   - **Client IDs** = `bastienboubat.Kidmapp,<ton.services.id.web>` (sans espace).
   - **Secret** = JWT généré à partir du même Team ID + Key ID + clé .p8, et **lié au Services ID web** (pas au Bundle ID) — c'est le Services ID qui sert pour le flow OAuth web.
   - Vérifier que le secret n'est pas expiré (Apple : 6 mois max).

4. **Vérifier que le broker Lovable peut effectivement utiliser ton Services ID**
   - En BYOC, c'est ton **Services ID** qui doit être passé comme `client_id` à Apple lors du flow web.
   - Si le broker continue d'utiliser son propre client_id alors que Supabase attend le tien, il y aura un mismatch à l'étape callback. → ce point se confirme avec l'erreur exacte du point 1.

5. **Tester aussi sur l'URL publiée**
   - Lovable Cloud sépare environnements **Dev (preview)** et **Prod (published)** : tester sur `https://kidmapp.app` et `https://kidmapp.lovable.app`. Si ça marche sur l'un mais pas l'autre, c'est une config d'environnement (à corriger dans Cloud, pas dans le code).

## Pistes de correction selon le diagnostic

- **Erreur `invalid_client` ou `invalid_request` côté Apple** → le Services ID ou la Return URL ne sont pas bien enregistrés chez Apple. Re-saisir et sauvegarder, puis attendre quelques minutes.
- **Erreur `bad_oauth_state` / `invalid id_token` côté Supabase** → l'`aud` reçu ne match pas les Client IDs configurés. Vérifier l'ordre / la virgule, retirer espaces, et confirmer que c'est bien le Services ID (pas le Bundle ID) qui est utilisé pour le web.
- **Secret JWT expiré ou mal signé** → régénérer le client secret dans Cloud avec Team ID + Key ID + .p8 + Services ID.
- **Le broker Lovable n'envoie pas ton Services ID** → revenir en mode **managé** côté Supabase pour le web (et garder le Bundle ID uniquement pour le natif iOS via Capacitor, où tu envoies l'id_token directement à Supabase). C'est souvent le setup le plus simple.

## Recommandation

Étape immédiate : récupérer le **message d'erreur exact** sur le web (console + URL de retour). Sans ça on optimise à l'aveugle. Une fois l'erreur connue, on applique la correction ciblée parmi les 4 pistes ci-dessus.

Aucun changement de code applicatif n'est nécessaire à ce stade — c'est de la configuration Apple Developer + Supabase Cloud.
