## Objectif

Exposer publiquement le nombre de favoris sur les lieux et les sorties, sans jamais révéler qui a liké quoi.

## Constat vérifié

- `favorites` et `event_favorites` : policies uniquement « own row ». Aucune agrégation possible côté client. Elles ne seront pas touchées.
- `locations` : UPDATE réservé aux admins → aucun garde-fou nécessaire.
- `events` : `events_update_own_pending` permet à un contributeur de modifier son event en pending → garde-fou obligatoire sur `favorites_count`.
- `supabase/add_favorites_count.sql` n'existe pas dans le repo ; le SQL est écrit directement dans la migration.

## Migration SQL (unique, idempotente) — ordre exact

1. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS favorites_count integer NOT NULL DEFAULT 0` sur `public.locations` et `public.events`.
2. Deux fonctions trigger `SECURITY DEFINER`, `SET search_path = public` :
   - `sync_location_favorites_count()` : `+1` sur INSERT, `GREATEST(count - 1, 0)` sur DELETE, sur `locations.id = NEW/OLD.location_id`.
   - `sync_event_favorites_count()` : idem sur `events.id = NEW/OLD.event_id`.
3. Triggers `AFTER INSERT OR DELETE FOR EACH ROW` sur `favorites` et `event_favorites` (drop-if-exists avant create).
4. **Backfill** des deux colonnes depuis un `COUNT` groupé sur les favoris existants — exécuté **avant** la création du garde-fou.
5. **Garde-fou anti-falsification** (créé après le backfill) : fonction `protect_event_favorites_count()` **sans** `SECURITY DEFINER`, avec `SET search_path = public`, corps :

```text
IF pg_trigger_depth() = 1
   AND auth.uid() IS NOT NULL
   AND NOT public.is_admin(auth.uid()) THEN
  NEW.favorites_count := OLD.favorites_count;
END IF;
```

   branchée en `BEFORE UPDATE ON public.events FOR EACH ROW`.
   - `pg_trigger_depth() = 1` : ne bride que les UPDATE clients directs ; l'écriture faite par `sync_event_favorites_count()` arrive en depth 2 et passe.
   - `auth.uid() IS NOT NULL` : évite que le contexte migration/serveur (uid NULL) soit traité comme un non-admin ; sans risque puisque `anon` n'a aucune policy UPDATE sur `events`.
6. Index `(favorites_count DESC)` sur `locations` et `events` pour le futur tri « les plus aimés ».

## Après migration

Types Supabase régénérés automatiquement. Aucun changement de composant dans ce lot ; l'affichage du compteur dans l'UI est un lot séparé à valider.

## Notes techniques

- Aucune policy sur `favorites` / `event_favorites` n'est modifiée.
- Les triggers de comptage sont `SECURITY DEFINER` car le liker n'a aucun droit d'UPDATE sur `locations` / `events`.
