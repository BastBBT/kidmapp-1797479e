# Verrouillage du marquage "coup de cœur" admin

## Objectif
Empêcher qu'un utilisateur non-admin puisse écrire `admin_fav` / `admin_fav_at` sur un événement, y compris via la policy `events_update_own_pending` qui autorise la mise à jour de sa propre proposition en attente.

## Approche
Un trigger `BEFORE UPDATE` sur `public.events`, calqué sur le garde-fou existant `public.protect_event_favorites_count` : mêmes conditions (`pg_trigger_depth() = 1`, session authentifiée, non-admin) et pas de `SECURITY DEFINER`. Les deux colonnes sont silencieusement remises à leurs anciennes valeurs ; le reste de la mise à jour passe normalement. Les écritures serveur (cron, edge functions, triggers en cascade) ne sont pas impactées.

## Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.events_guard_admin_fav()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() = 1
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid()) THEN
    NEW.admin_fav := OLD.admin_fav;
    NEW.admin_fav_at := OLD.admin_fav_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_guard_admin_fav ON public.events;
CREATE TRIGGER events_guard_admin_fav
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_guard_admin_fav();
```

## Hors périmètre
- Aucune modification de policy RLS.
- Aucune modification d'UI ni de code React.
