ALTER TABLE public.locations DROP CONSTRAINT locations_note_length;
ALTER TABLE public.locations ADD CONSTRAINT locations_note_length CHECK (char_length(note) <= 1000);