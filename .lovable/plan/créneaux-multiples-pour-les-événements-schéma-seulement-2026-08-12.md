# Créneaux multiples pour les événements (schéma seulement)

Ajout d'une table `event_occurrences` permettant à un événement d'avoir plusieurs dates/heures, sans aucun changement d'interface pour l'instant. Les clients actuels (web, iOS, Android) continuent de fonctionner grâce à une synchronisation automatique.

## Ce qui est mis en place

- **Nouvelle table `event_occurrences`** : rattachée à un événement, avec date de début, date de fin optionnelle et horaire. Supprimée automatiquement si l'événement est supprimé.
- **Règles d'accès** :
  - Tout le monde peut voir les créneaux des événements publiés.
  - Un utilisateur connecté voit les créneaux de ses propres événements.
  - Les admins voient, créent, modifient et suppriment tous les créneaux.
  - Un utilisateur peut créer/modifier/supprimer les créneaux de ses événements tant qu'ils sont en attente de validation.
- **Reprise des données existantes** : chaque événement déjà en base reçoit un créneau reprenant ses dates actuelles.
- **Compatibilité descendante** :
  - Toute création d'événement génère automatiquement son créneau unique.
  - Les champs date/heure de la fiche événement restent synchronisés sur le créneau le plus proche, pour que les apps non encore mises à jour continuent d'afficher la bonne date.
- **Index** sur l'événement et la date de début pour des requêtes rapides.

## Détails techniques

Migration unique, appliquée telle que fournie :

- `CREATE TABLE public.event_occurrences` (FK `event_id` → `events` ON DELETE CASCADE), puis GRANTs (`anon` SELECT, `authenticated` CRUD, `service_role` ALL), puis `ENABLE ROW LEVEL SECURITY`, puis les 9 policies (select published/own/admin, insert admin/own_pending, update admin/own_pending, delete admin/own_pending).
- Index `event_occurrences_event_id_idx` et `event_occurrences_date_start_idx`.
- Trigger `event_occurrences_updated_at` sur `public.update_updated_at_column()`.
- Backfill `INSERT ... SELECT id, date_start, date_end, time FROM public.events`.
- Fonction `public.sync_event_dates_from_occurrences()` (SECURITY DEFINER, `search_path = public`) + trigger `event_occurrences_sync_legacy` AFTER INSERT/UPDATE/DELETE : recopie le créneau le plus tôt dans `events`.
- Fonction `public.create_default_occurrence()` + trigger `events_create_default_occurrence` AFTER INSERT sur `events`.

Point de vigilance vérifié : les triggers de garde existants sur `events` (`protect_event_favorites_count`, `events_guard_admin_fav`) filtrent sur `pg_trigger_depth() = 1`, donc l'UPDATE déclenché en cascade par la synchronisation ne sera pas bloqué.

Aucun fichier front n'est modifié ; les types générés de la base seront rafraîchis après la migration.
