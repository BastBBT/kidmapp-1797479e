# Correction de `sync_event_dates_from_occurrences()`

## Problème
La fonction `public.sync_event_dates_from_occurrences()` sélectionne actuellement le créneau le plus ancien (`MIN(date_start)`) sans tenir compte de la date du jour. Pour un événement à plusieurs créneaux dont le premier est terminé, la fiche `events` garde une `date_start`/`date_end` périmée, ce qui fait sortir l'événement des filtres de date des apps qui lisent encore ces champs (iOS/Android/web non mis à jour), même s'il a des créneaux à venir.

## Correction
Réécriture de la fonction avec une logique en deux temps :

1. **Prochain créneau à venir** : le créneau le plus proche dont la fin (`COALESCE(date_end, date_start)`) est `>= CURRENT_DATE`, trié par `date_start` ascendant.
2. **Repli sur le passé** : si aucun créneau à venir, on prend le créneau passé le plus récent (`ORDER BY date_start DESC`).

Si l'événement n'a plus aucun créneau (tous supprimés), la fonction ne modifie rien et retourne `COALESCE(NEW, OLD)`.

La signature reste inchangée (SECURITY DEFINER, `search_path = public`, trigger `event_occurrences_sync_legacy` AFTER INSERT/UPDATE/DELETE) — aucun changement de RLS ni d'interface, les apps non mises à jour continuent d'afficher la bonne date.

## Migration
```sql
CREATE OR REPLACE FUNCTION public.sync_event_dates_from_occurrences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_event uuid;
  earliest RECORD;
BEGIN
  target_event := COALESCE(NEW.event_id, OLD.event_id);

  -- Prochain créneau à venir (ou en cours) le plus proche.
  SELECT date_start, date_end, time INTO earliest
  FROM public.event_occurrences
  WHERE event_id = target_event
    AND COALESCE(date_end, date_start) >= CURRENT_DATE
  ORDER BY date_start ASC
  LIMIT 1;

  -- Sinon, le créneau passé le plus récent.
  IF earliest IS NULL THEN
    SELECT date_start, date_end, time INTO earliest
    FROM public.event_occurrences
    WHERE event_id = target_event
    ORDER BY date_start DESC
    LIMIT 1;
  END IF;

  IF earliest IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.events
  SET date_start = earliest.date_start, date_end = earliest.date_end, time = earliest.time
  WHERE id = target_event;

  RETURN COALESCE(NEW, OLD);
END;
$$;
```

Aucun autre objet n'est touché (trigger existant conservé, pas de RLS, pas d'UI).
