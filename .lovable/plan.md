## Objectif
Permettre aux admins d'insérer directement un événement dans `public.events`, quel que soit le statut ou le `user_id`.

## Constat vérifié
Les policies actuelles sur `public.events` : `events_insert_own_pending` est la seule policy INSERT, et elle impose `user_id = auth.uid() AND status = 'pending'`. Aucune policy INSERT admin n'existe (contrairement à `locations`, qui a `locations_insert_admin`).

## Changement
Une seule migration, aucun changement de code front :

```sql
CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
```

Les policies INSERT étant permissives et cumulatives (OR), les utilisateurs standards conservent la possibilité de proposer un événement en `pending`, et les admins peuvent insérer n'importe quel statut / `user_id`.

## Détails techniques
- `public.is_admin(uuid)` existe déjà (security definer, lit `profiles.role`), utilisé par les policies admin `events_select/update/delete`.
- Les GRANTs sur `public.events` sont déjà en place pour `authenticated` (les inserts users fonctionnent), rien à ajouter.
- Impact sécurité : accès élargi uniquement aux comptes admin.
