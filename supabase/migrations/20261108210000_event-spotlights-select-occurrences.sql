-- La sortie est « à venir » si ses dates le disent OU si un de ses créneaux est à venir.
DROP POLICY IF EXISTS event_spotlights_select_active ON public.event_spotlights;

CREATE POLICY event_spotlights_select_active
  ON public.event_spotlights FOR SELECT
  TO anon, authenticated
  USING (
    starts_on <= (now() AT TIME ZONE 'Europe/Paris')::date
    AND ends_on >= (now() AT TIME ZONE 'Europe/Paris')::date
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_spotlights.event_id
        AND e.status = 'published'
        AND (
          COALESCE(e.date_end, e.date_start) >= (now() AT TIME ZONE 'Europe/Paris')::date
          OR EXISTS (
            SELECT 1 FROM public.event_occurrences o
            WHERE o.event_id = e.id
              AND COALESCE(o.date_end, o.date_start) >= (now() AT TIME ZONE 'Europe/Paris')::date
          )
        )
    )
  );
