import { supabase } from '@/integrations/supabase/client';

const MAX_CONTRIBUTION_PHOTOS = 5;

// Un `contributions.content` est un JSON libre que n'importe quel utilisateur authentifié
// peut écrire directement (la policy RLS ne vérifie que `user_id = auth.uid()`, jamais la
// forme du contenu). `photo_urls` doit donc être revalidé ici avant tout rendu <img> et avant
// toute fusion dans `locations.photos` (colonne publique) — le garde-fou côté ContributeSheet
// (5 photos, upload vers le bucket Kidmapp) est uniquement côté client.
const ALLOWED_PREFIX = supabase.storage.from('location-photos').getPublicUrl('proposals/').data.publicUrl;

/** Ne garde que les URLs qui pointent réellement vers le bucket `location-photos/proposals/...` du projet, dans la limite de 5. */
export function sanitizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((url): url is string => typeof url === 'string' && url.startsWith(ALLOWED_PREFIX))
    .slice(0, MAX_CONTRIBUTION_PHOTOS);
}
