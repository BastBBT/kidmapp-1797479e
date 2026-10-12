-- Colonnes de revue automatique (bot de collecte) sur les events — purement additif.
-- review_flags NOT NULL DEFAULT '{}' : les lignes existantes sont « non évaluées » au sens
-- des apps, car review_checked_at reste NULL pour toutes.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS review_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS review_detail text,
  ADD COLUMN IF NOT EXISTS review_checked_at timestamptz;

COMMENT ON COLUMN public.events.review_flags IS 'Codes des points à vérifier posés par le bot de collecte (ensemble fermé, voir contrainte). Vide = rien à vérifier.';
COMMENT ON COLUMN public.events.review_detail IS 'Explication lisible des points de review_flags, ex. « Le lien redirige vers la page d''accueil de l''agenda ».';
COMMENT ON COLUMN public.events.review_checked_at IS 'Date de l''évaluation automatique du bot. NULL = non évalué (events proposés par les utilisateurs ou anciens events).';

-- Ensemble fermé de codes : un drapeau inconnu doit être refusé plutôt que silencieusement
-- ignoré par l'UI d'admin à venir. Sous-ensemble uniquement ; les doublons éventuels sont
-- tolérés (tableau, pas ensemble) et sans effet à l'affichage.
ALTER TABLE public.events
  ADD CONSTRAINT events_review_flags_allowed
  CHECK (review_flags <@ ARRAY[
    'lien_source',
    'date_non_trouvee',
    'tarif_ambigu',
    'public_enfant_non_prouve',
    'doublon_possible',
    'hors_zone',
    'source_a_risque'
  ]::text[]);
