# Marquage "coup de cœur admin" sur les événements

## Objectif
Ajouter au schéma `public.events` un marquage binaire et sa date, permettant aux admins de désigner des événements comme "coups de cœur".

## Changements prévus

### Base de données
Exécuter une migration SQL sur `public.events` :

- Ajouter la colonne `admin_fav` (`boolean NOT NULL DEFAULT false`).
- Ajouter la colonne `admin_fav_at` (`timestamptz`, nullable).
- Créer un index partiel `events_admin_fav_idx` sur `(admin_fav, admin_fav_at DESC)` avec une clause `WHERE admin_fav`, pour lister efficacement les coups de cœur actifs par date décroissante.

### RLS / code applicatif
- Aucune nouvelle policy RLS : l'écriture reste couverte par `events_update_admin`, la lecture par les policies `SELECT` existantes.
- Aucune modification côté UI ou API React (traité dans une PR séparée par l'utilisateur).

## SQL de la migration

```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS admin_fav boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_fav_at timestamptz;

CREATE INDEX IF NOT EXISTS events_admin_fav_idx
  ON public.events (admin_fav, admin_fav_at DESC)
  WHERE admin_fav;
```
