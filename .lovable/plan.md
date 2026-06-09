## Objectif
Rattraper rétroactivement tous les points qui auraient dû être attribués avant l'installation des triggers `handle_contribution_validated_points` et `handle_proposal_approved_points`.

## Migration one-shot (idempotente)

### 1. Backfill `point_events` pour les contributions validées
Pour chaque ligne `contributions` avec `status = 'validated'` et `user_id IS NOT NULL` :
- Insérer `(user_id, 10, 'contribution_validated', contributions.id::text, now())` dans `point_events`.
- **Idempotence** : `WHERE NOT EXISTS (SELECT 1 FROM point_events WHERE reason = 'contribution_validated' AND reference_id = contributions.id::text)`.

### 2. Backfill du bonus `first_contribution`
Identifier, par `location_id`, la **première contribution validée chronologiquement** (`ROW_NUMBER() OVER (PARTITION BY location_id ORDER BY created_at ASC)`).
- Pour chacune (qui a un `user_id`), insérer `(user_id, 5, 'first_contribution', contributions.id::text, now())`.
- Même garde idempotente sur `(reason, reference_id)`.

### 3. Backfill `point_events` pour les propositions approuvées
Pour chaque `location_proposals` avec `status = 'approved'` et `user_id IS NOT NULL` :
- Insérer `(user_id, 25, 'proposal_approved', proposal.id::text, now())`.
- Même garde idempotente.

### 4. Recalcul `profiles.points`
```sql
UPDATE public.profiles p
SET points = LEAST(COALESCE(s.total, 0), 500)
FROM (
  SELECT user_id, SUM(amount) AS total
  FROM public.point_events
  GROUP BY user_id
) s
WHERE p.id = s.user_id;
```
Et remettre à 0 ceux sans events (sécurité) :
```sql
UPDATE public.profiles SET points = 0
WHERE id NOT IN (SELECT DISTINCT user_id FROM public.point_events WHERE user_id IS NOT NULL);
```

## Détails techniques
- Toute la migration tourne dans une transaction.
- `created_at` = `now()` pour tous les events backfillés (acceptable car l'UI affichera "il y a quelques instants" sur les anciens — pas de page historique pour l'instant).
- La fonction `award_points()` existante n'est pas utilisée ici : on insère directement pour pouvoir contrôler la garde idempotente sur `(reason, reference_id)` et grouper le recalcul à la fin.
- Pas de modification de schéma, pas de nouveau trigger.

## Vérification post-migration
Re-lancer la requête de contrôle sur `bastien.boubat@gmail.com` :
- 5 contribs validées → 5 events `contribution_validated` (+50 pts)
- + bonus `first_contribution` selon nb de lieux distincts
- 42 propositions approuvées → 42 events `proposal_approved` (+1050 pts)
- Total cappé à **500 pts** dans `profiles.points`.

## Hors scope
- Pas d'UI historique (déjà couverte par les badges +10/+25 sur AccountPage).
- Pas de modification des triggers existants.