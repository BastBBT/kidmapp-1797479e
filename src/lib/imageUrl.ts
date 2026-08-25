/**
 * Réécriture d'URL vers l'endpoint de transformation d'image de Supabase Storage.
 *
 * Miroir de `URL.supabaseResized(...)` dans Kidmapp-xcode/ImageLoader.swift et de
 * `supabaseResized(...)` dans kidmapp_flutter/lib/utils/image_url.dart.
 *
 * Pourquoi : les photos du bucket sont les fichiers d'origine — jusqu'à 4896x3264 pour
 * une photo de téléphone, et 30 PNG à plus de 1,3 octet par pixel. Servir le fichier
 * brut dans une carte de liste revient à télécharger plusieurs Mo pour une vignette.
 * Mesuré sur les 150 photos du bucket : 68,7 Mo bruts contre 6,6 Mo en 400 px WebP.
 *
 * Le navigateur envoie déjà `Accept: image/avif,image/webp` de lui-même, donc la
 * conversion en WebP est automatique ici — contrairement à iOS et Flutter, où il a
 * fallu ajouter l'en-tête à la main.
 */

const OBJECT_PATH = '/storage/v1/object/public';
const RENDER_PATH = '/storage/v1/render/image/public';

type Options = {
  width: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

/**
 * Renvoie une URL redimensionnée côté serveur, ou l'URL inchangée si elle ne pointe pas
 * vers un objet public du bucket : l'endpoint ne sait transformer que ce qu'il héberge,
 * et une bonne partie des photos sont encore hotlinkées chez les lieux.
 */
export function supabaseResized(
  url: string | null | undefined,
  { width, height, quality = 75, resize = 'cover' }: Options,
): string | undefined {
  if (!url) return undefined;
  if (!url.includes(OBJECT_PATH)) return url;
  try {
    const u = new URL(url.replace(OBJECT_PATH, RENDER_PATH));
    u.searchParams.set('width', String(width));
    if (height !== undefined) u.searchParams.set('height', String(height));
    u.searchParams.set('resize', resize);
    u.searchParams.set('quality', String(quality));
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * À poser en `onError` sur tout `<img src={supabaseResized(url, ...)}>` : le
 * `try/catch` de `supabaseResized` ne protège que la construction de l'URL, pas la
 * requête HTTP réelle. Si l'endpoint de transformation refuse la source (au-delà de
 * ses bornes de taille/pixels, format non supporté...), il répond en erreur au lieu
 * de l'image, et sans repli l'utilisateur voit une icône cassée pour une photo qui
 * s'affichait très bien avant l'introduction de ce redimensionnement serveur.
 */
export function onResizedImageError(rawUrl: string | null | undefined) {
  return (event: { currentTarget: HTMLImageElement }) => {
    const img = event.currentTarget;
    if (!rawUrl || img.src === rawUrl) return; // pas de brut connu, ou déjà retombé dessus
    img.onerror = null;
    img.src = rawUrl;
  };
}
