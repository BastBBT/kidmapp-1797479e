ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_note_length;
ALTER TABLE public.locations ADD CONSTRAINT locations_note_length CHECK (char_length(note) <= 2000);

ALTER TABLE public.location_proposals DROP CONSTRAINT IF EXISTS proposals_note_length;
ALTER TABLE public.location_proposals ADD CONSTRAINT proposals_note_length CHECK (char_length(note) <= 2000);