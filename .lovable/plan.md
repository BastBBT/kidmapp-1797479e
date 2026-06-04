## Objectif

Envoyer un email automatique à l'auteur quand un admin :
- valide une contribution (`contributions.status` → `validated`)
- approuve une proposition de lieu (`location_proposals.status` → `approved`)

Utilisation de l'infra email Lovable Cloud déjà en place (domaine `notify.kidmapp.app` vérifié, queue pgmq, `send-transactional-email` déployé).

## 1. Templates React Email

Créer deux templates dans `supabase/functions/_shared/transactional-email-templates/` :

- **`contribution-validated.tsx`** — "Ta contribution a été validée 🎉"
  - Props : `userName?`, `locationName`, `locationId` (UUID), `contributionType` (photo, équipement, repas, etc.)
  - Brandé Kidmapp : Fraunces (titres), DM Sans (body), couleurs Coral `#D95F3B` / Green `#3B7D6E` / Cream `#FAF9F6`, radius 18px
  - CTA bouton → `https://kidmapp.app/location/{locationId}`

- **`proposal-approved.tsx`** — "Ton lieu a été ajouté à Kidmapp 🗺️"
  - Props : `userName?`, `locationName`, `locationId` (UUID)
  - Même style, CTA vers `https://kidmapp.app/location/{locationId}`

Mise à jour de `registry.ts` pour enregistrer les deux templates.

## 2. Edge function de notification

Créer `supabase/functions/notify-validation/index.ts` :

- Reçoit `{ type: 'contribution' | 'proposal', recordId: string }` depuis les triggers DB
- Résout l'email de l'auteur via `auth.admin.getUserById(user_id)` (service role)
- Récupère le `full_name` depuis `profiles`, et le `name` du lieu depuis `locations`
- Appelle `send-transactional-email` avec le bon template et `idempotencyKey = '{type}-{recordId}'`
- `verify_jwt = false` dans `config.toml` (appelé depuis pg_net sans JWT utilisateur)
- Validation Zod du body, CORS, logs propres

## 3. Migration SQL — triggers async via pg_net

Une migration qui crée :

- Fonction `notify_validation_async(record_type text, record_id uuid)` qui fait un `net.http_post` vers l'edge function `notify-validation` avec le service role key (depuis Vault, comme `email_queue_service_role_key`)
- Trigger `on_contribution_validated` AFTER UPDATE sur `contributions` : se déclenche quand `OLD.status != 'validated' AND NEW.status = 'validated'`
- Trigger `on_proposal_approved` AFTER UPDATE sur `location_proposals` : se déclenche quand `OLD.status != 'approved' AND NEW.status = 'approved'`

Non-bloquant : `pg_net` est asynchrone, aucun impact sur la performance de la requête admin. Si l'edge function échoue, la validation reste effective côté DB.

## 4. Déploiement & test

- Déployer `notify-validation` et `send-transactional-email` (rebuild après changement du registry)
- Test manuel : valider une contribution depuis `/gestion-k1dm4p` → vérifier que l'email arrive
- En cas de souci : inspecter `email_send_log` (status `pending`/`sent`/`failed`) et logs edge functions

## Détails techniques

- **Pas de RESEND_API_KEY** — tout passe par l'infra Lovable (Mailgun derrière)
- **Pas de changement UI** — purement backend
- **Suppression automatique** respectée (table `suppressed_emails`)
- **Footer unsubscribe** ajouté automatiquement par l'infra
- **iOS-friendly** : 100% serveur, l'app mobile n'envoie rien elle-même
- **Liens CTA** : `https://kidmapp.app/location/{locationId}` (UUID, pas de slug — la table locations n'a pas de champ slug)

## Fichiers

- `supabase/functions/_shared/transactional-email-templates/contribution-validated.tsx` (nouveau)
- `supabase/functions/_shared/transactional-email-templates/proposal-approved.tsx` (nouveau)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (modifié)
- `supabase/functions/notify-validation/index.ts` (nouveau)
- `supabase/config.toml` (ajout bloc `[functions.notify-validation]`)
- Nouvelle migration SQL (fonction + 2 triggers)
