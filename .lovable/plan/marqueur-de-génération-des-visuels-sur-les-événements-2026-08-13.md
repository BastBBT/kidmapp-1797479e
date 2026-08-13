# Marqueur de génération des visuels sur les événements

## Objectif
Permettre au compte bot (`bastien.boubat+event@gmail.com`) et aux admins de poser un horodatage `admin_fav_visual_at` sur un événement « coup de cœur », via une fonction sécurisée. Aucun changement d'UI.

## Vérifications préalables
- `public.events.admin_fav` (boolean) existe déjà — confirmé par le schéma courant.
- Le trigger `events_guard_admin_fav` (BEFORE UPDATE) existe déjà et protège `admin_fav` / `admin_fav_at`. Il ne sera **pas** modifié : la nouvelle colonne `admin_fav_visual_at` ne doit pas être protégée, car le compte bot non-admin l'écrit via la fonction.
- `public.is_admin(uuid)` existe déjà (SECURITY DEFINER).

## Changements prévus

### Base de données
Migration SQL sur `public.events` :

1. Ajouter la colonne `admin_fav_visual_at timestamptz` (nullable).
2. Créer la fonction `public.mark_event_visual_generated(_event_id uuid)` :
   - `SECURITY DEFINER`, `SET search_path = public`.
   - Autorise l'appel si l'utilisateur courant est admin (`public.is_admin(auth.uid())`) OU si l'email du JWT vaut `bastien.boubat+event@gmail.com`.
   - Sinon lève une exception `'non autorisé'`.
   - Met à jour `admin_fav_visual_at = now()` sur l'événement `_event_id` **uniquement si `admin_fav` est vrai** (uniquement les coups de cœur).
   - Lève `'aucun événement coup de cœur avec cet identifiant'` si aucune ligne n'a été mise à jour, pour éviter un succès trompeur.
   3. Révoquer l'exécution de la fonction à `public` et `anon`.
4. Accorder l'exécution à `authenticated`.

### RLS / UI
- Aucune modification de policy RLS : l'écriture passe uniquement par la fonction SECURITY DEFINER.
- Aucune modification du trigger `events_guard_admin_fav`.
- Aucune modification d'UI.

## SQL de la migration

```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS admin_fav_visual_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_event_visual_generated(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin(auth.uid())
    OR auth.jwt() ->> 'email' = 'bastien.boubat+event@gmail.com'
  ) THEN
    RAISE EXCEPTION 'non autorisé';
  END IF;

  UPDATE public.events
     SET admin_fav_visual_at = now()
   WHERE id = _event_id AND admin_fav;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'aucun événement coup de cœur avec cet identifiant';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_event_visual_generated(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_event_visual_generated(uuid) TO authenticated;
```

## Hors périmètre
- Trigger `events_guard_admin_fav` : non modifié.
- UI / code React : non modifié.
