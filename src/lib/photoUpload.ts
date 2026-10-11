import { supabase } from '@/integrations/supabase/client';

/**
 * Règles communes aux uploads de photos vers le bucket `location-photos` (galerie des lieux,
 * proposition d'événement). `image/*` est trop large : SVG (script servi depuis l'origine du
 * bucket public) et HEIC (illisible hors Safari) y passent.
 */
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 Mo

const BUCKET_URL_PREFIX = supabase.storage.from('location-photos').getPublicUrl('x').data.publicUrl.slice(0, -1);

/**
 * Vrai si l'URL pointe vers le bucket `location-photos` du projet. `events.photos` est une
 * colonne que l'auteur d'une proposition peut écrire directement par l'API, avec n'importe quelle
 * URL (pixel de suivi, image externe) : on ne publie que ce qui vit dans notre bucket.
 */
export const isBucketPhotoUrl = (url: string) => url.startsWith(BUCKET_URL_PREFIX);
