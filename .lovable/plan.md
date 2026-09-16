# Lien de réservation sur les sorties + distinction du type de lien dans le tracking

## Objectif

Ajouter un second lien `booking_url` sur les sorties (distinct du `website`), et permettre au tracking des clics sortants de distinguer un clic vers le site web classique d'un clic vers le lien de réservation.

## 1. Colonne `events.booking_url`

- `ALTER TABLE public.events ADD COLUMN booking_url text NULL`.
- Aucune donnée existante n'est modifiée (toutes les valeurs restent `NULL`).
- Les policies de lecture publique de `events` ne référencent pas de colonnes spécifiques — aucun changement RLS nécessaire.

## 2. Colonne `link_clicks.link_type`

- `ALTER TABLE public.link_clicks ADD COLUMN link_type text NOT NULL DEFAULT 'website' CHECK (link_type IN ('website', 'booking'))`.
- Le défaut `'website'` couvre les lignes existantes : aucune régression, les clics déjà enregistrés restent considérés comme des clics `website`.
- Aucune policy RLS de `link_clicks` ne référence de colonne spécifique — aucun changement RLS nécessaire.

## 3. Mise à jour de la fonction `admin_link_clicks_stats(p_days)`

Re-créer la fonction (même garde admin, `SECURITY DEFINER`, `SET search_path = public`, `LIMIT 50`) avec :

- `link_type` ajouté au `GROUP BY` et retourné dans le résultat (un rang devient un couple fiche × type de lien).
- `booking_url` retourné en plus de `website` :
  - pour un lieu : `booking_url` reste `NULL` (les lieux n'ont pas de lien de réservation),
  - pour une sortie : `e.booking_url`.
- Signature de retour : `entity_type, entity_id, name, category, website, booking_url, link_type, click_count`.

`REVOKE ALL ... FROM public, anon` puis `GRANT EXECUTE TO authenticated` reconduits à l'identique.

## 4. Code concerné (hors migration, à valider ensuite)

- `src/types/event.ts` : ajouter `booking_url: string | null` à `EventItem`.
- `src/lib/trackLinkClick.ts` : accepter un `linkType: 'website' | 'booking'` et l'écrire dans la colonne `link_type`.
- `src/hooks/useLinkClicksStats.ts` : étendre `LinkClickStatRow` avec `link_type` et `booking_url`.
- `src/pages/EventPage.tsx` : bouton « Réservation » appelant `trackLinkClick` avec `linkType: 'booking'`.
- `AdminPage.tsx` (onglet Trafic sortant) : distinguer les deux types de lien dans l'affichage.

> La présente demande ne couvre que la migration de schéma. Les changements de code React seront traités dans un second temps.

## SQL de la migration

```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS booking_url text NULL;

ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'website'
    CHECK (link_type IN ('website', 'booking'));

CREATE OR REPLACE FUNCTION public.admin_link_clicks_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  name text,
  category text,
  website text,
  booking_url text,
  link_type text,
  click_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.entity_type,
    c.entity_id,
    COALESCE(l.name, e.name) AS name,
    COALESCE(l.category, c.category) AS category,
    COALESCE(l.website, e.website) AS website,
    e.booking_url AS booking_url,
    c.link_type AS link_type,
    count(*) AS click_count
  FROM public.link_clicks c
  LEFT JOIN public.locations l ON c.entity_type = 'location' AND l.id = c.entity_id
  LEFT JOIN public.events e ON c.entity_type = 'event' AND e.id = c.entity_id
  WHERE c.created_at >= now() - make_interval(days => GREATEST(p_days, 1))
  GROUP BY c.entity_type, c.entity_id, COALESCE(l.name, e.name),
           COALESCE(l.category, c.category), COALESCE(l.website, e.website),
           e.booking_url, c.link_type
  ORDER BY count(*) DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_clicks_stats(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_clicks_stats(integer) TO authenticated;
```
