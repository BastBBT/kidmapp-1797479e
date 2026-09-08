# Correction RPC admin_dashboard_stats() : filtre manquant sur pendingEvents

## Constat vérifié

La fonction `public.admin_dashboard_stats()` contient un bug : le compteur `v_pending_events` est calculé sans exclure les comptes admin et le bot de sourcing, alors que **tous les autres compteurs** de la même fonction (`pendingContributions`, `pendingProposals`, `pendingEventsList`, `newUsers30d`, `acquisitionDistribution`) appliquent bien le filtre `user_id IS NULL OR NOT (user_id = ANY(v_excluded))`.

Requête actuelle (confirmée via `pg_get_functiondef`) :

```sql
SELECT count(*),
       count(*) FILTER (WHERE user_id = v_bot_id)
INTO v_pending_events, v_pending_events_bot
FROM public.events
WHERE status = 'pending';
```

Conséquence : la tuile « Événements à valider » inclut les événements du bot et des admins, **et** la ligne séparée « + N événements du bot » les compte une seconde fois — les deux se recouvrent.

## Correction

Une migration remplace `CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()` avec la requête corrigée :

```sql
SELECT count(*) FILTER (WHERE user_id IS NULL OR NOT (user_id = ANY(v_excluded))),
       count(*) FILTER (WHERE user_id = v_bot_id)
INTO v_pending_events, v_pending_events_bot
FROM public.events
WHERE status = 'pending';
```

`v_pending_events` exclut maintenant `v_excluded` (admin + bot), sur le même modèle que `v_pending_events_list`. `v_pending_events_bot` reste inchangé (compte séparé du bot). Le reste de la fonction est identique.

## Détail technique

- Migration : `CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()` — même signature, `STABLE SECURITY DEFINER SET search_path = 'public'`, même garde `is_admin(auth.uid())`, même structure `v_excluded` / `v_bot_id`. Seule la requête `v_pending_events` / `v_pending_events_bot` change (un `count(*)` → `count(*) FILTER (WHERE ...)`).
- Aucun changement côté client (`AdminPage.tsx`) : `pendingEvents` et `pendingEventsBotCount` sont déjà consommés séparément, le comportement d'affichage reste le même — seule la valeur de `pendingEvents` baisse pour exclure le bot et les admins.
- Pas de nouvelle table, pas de nouveau GRANT, pas de nouvelle policy.
