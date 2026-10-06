# Horaires d'ouverture sur `locations` (schéma uniquement)

## 1. Migration
Appliquée via l'outil de migration, puis copiée dans `supabase/migrations/<timestamp>_locations-opening-hours.sql` (historique de référence) :

```sql
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS google_place_id          text,
  ADD COLUMN IF NOT EXISTS opening_hours            jsonb,
  ADD COLUMN IF NOT EXISTS opening_hours_source     text,
  ADD COLUMN IF NOT EXISTS opening_hours_updated_at timestamptz;

ALTER TABLE public.locations
  ADD CONSTRAINT locations_opening_hours_source_check
  CHECK (opening_hours_source IS NULL OR opening_hours_source IN ('google_auto','manuel'));

CREATE UNIQUE INDEX IF NOT EXISTS locations_google_place_id_key
  ON public.locations (google_place_id) WHERE google_place_id IS NOT NULL;
```
Aucune contrainte sur la structure du JSON. Colonnes nullables, aucun backfill.

## 2. RLS — vérifiée, aucun changement
Policies actuelles de `locations` :
- SELECT : `locations_select_published` (status = 'published') et `locations_select_admin` — couvrent les nouvelles colonnes.
- INSERT / UPDATE / DELETE : uniquement `*_admin` (profiles.role = 'admin').
- Aucune policy UPDATE non-admin : rien à restreindre.
`location_proposals` non touchée.

## 3. Secret
Ouverture du formulaire sécurisé pour `GOOGLE_PLACES_API_KEY` (valeur saisie par toi), accessible uniquement aux Edge Functions.

## 4. Hors périmètre
Pas de cron, pas d'Edge Function, pas d'UI ; seul `types.ts` sera régénéré automatiquement.
