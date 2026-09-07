# Timeouts Postgres : index manquants + RPC d'agrégation du dashboard admin

## Constat vérifié

Aucun des quatre index demandés n'existe aujourd'hui (vérifié dans `pg_indexes`) : sur `locations`, `profiles` et `location_proposals`, seuls les index de clé primaire (plus `favorites_count` sur `locations`) sont présents ; `contributions` n'a que sa clé primaire. Seule la table `events` est déjà bien indexée (status, date_start, user_id).

Le dashboard admin (`src/pages/AdminPage.tsx`, requête `admin-stats`) lit bien en entier `locations`, `contributions`, `location_proposals`, `events` et deux fois `profiles`, puis compte côté navigateur, et appelle en plus l'edge function `admin-list-user-emails` pour retrouver le compte bot.

## Partie 1 — Index (additif, aucun changement de comportement)

Une migration crée :

- `locations (status, category)`
- `profiles (role)`
- `contributions (created_at)`
- `location_proposals (status)`

## Partie 2 — RPC `admin_dashboard_stats()`

Nouvelle fonction SQL réservée aux admins, sur le même modèle que `admin_audience_stats()`, renvoyant en un seul appel :

- lieux : total, publiés, en attente
- contributions : total, en attente, et le détail jour par jour des 7 derniers jours
- propositions de lieux : en attente
- événements : nombre en attente + les 5 plus récents (id, nom, date de début)
- utilisateurs : comptes créés sur 30 jours et répartition par source d'acquisition (sources renseignées uniquement)

Exclusions faites directement en base : profils `admin` et compte bot `bastien.boubat+event@gmail.com` résolu depuis `auth.users`, exactement comme dans `admin_audience_stats` — pas de nouveau flag sur `profiles`, pas d'appel à l'edge function pour ces compteurs.

Point à noter : aujourd'hui les compteurs d'événements ne sont pas filtrés côté client. Avec la RPC, ils excluront eux aussi les comptes admin et le bot, ce qui fera probablement baisser le nombre d'« événements en attente » affiché — mais la liste de modération, elle, reste inchangée et continue d'afficher tout le contenu sourcé par le bot.

Le top 5 contributeurs / proposants reste calculé côté client, comme demandé.

## Détail technique

- Migration 1 : quatre `CREATE INDEX IF NOT EXISTS` (`idx_locations_status_category`, `idx_profiles_role`, `idx_contributions_created_at`, `idx_location_proposals_status`).
- Migration 2 : `CREATE OR REPLACE FUNCTION public.admin_dashboard_stats() RETURNS jsonb`, `STABLE SECURITY DEFINER SET search_path = public`, garde `IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION`, `REVOKE ALL ... FROM public` / `GRANT EXECUTE TO authenticated`. Tableau `v_excluded` construit comme dans `admin_audience_stats` (union rôles admin + email bot depuis `auth.users`).
- Clés JSON renvoyées : `totalLocations`, `publishedLocations`, `pendingLocations`, `totalContributions`, `pendingContributions`, `contributionsDaily7d` (objet date → nombre), `pendingProposals`, `pendingEvents`, `pendingEventsList`, `newUsers30d`, `acquisitionDistribution`, `acquisitionTotal`.
- `AdminPage.tsx` : remplacer les six `select` bruts et le bloc de résolution d'email par un `supabase.rpc('admin_dashboard_stats')` ; garder l'appel `admin_audience_stats` existant. `chartData` consomme `contributionsDaily7d` pré-agrégé au lieu de recompter des lignes.
- `excludedIds` / `admin-list-user-emails` restent utilisés par `useTopContributors` et par l'affichage des emails de modération ; `src/lib/adminBot.ts` n'est pas supprimé.
