import type { Location } from '@/types/location';

/**
 * Un média de la galerie : une photo, ou le reel Instagram du lieu.
 * Le reel ne porte pas d'image propre — il réutilise une photo du lieu en couverture.
 * Miroir de `LocationMedia` côté iOS/Android.
 */
export type LocationMedia = {
  /** L'image à afficher (null ⇒ dégradé de catégorie en repli). */
  coverUrl: string | null;
  /** Renseigné seulement pour le reel : le lien Instagram à ouvrir. */
  reelUrl?: string;
};

/**
 * Galerie ordonnée : la photo principale d'abord, puis les photos supplémentaires.
 * Les vides et les doublons sont écartés — la même URL ne doit pas défiler deux fois.
 */
export function galleryPhotos(location: Pick<Location, 'photo' | 'photos'>): string[] {
  const seen = new Set<string>();
  return [location.photo, ...(location.photos ?? [])].filter(
    (url): url is string => !!url && url.length > 0 && !seen.has(url) && !!seen.add(url),
  );
}

/**
 * Couverture du reel : la photo principale du lieu. Le reel étant toujours en dernière
 * position, reprendre la dernière photo collerait deux diapos identiques l'une à côté
 * de l'autre — la première est la plus éloignée dans le carrousel.
 */
export function reelCoverPhoto(
  location: Pick<Location, 'photo' | 'photos' | 'reel_url'>,
): string | null {
  if (!location.reel_url) return null;
  const photos = galleryPhotos(location);
  return photos.length ? photos[0] : null;
}

/** Photos puis, s'il existe, le reel en dernière position. */
export function galleryMedia(
  location: Pick<Location, 'photo' | 'photos' | 'reel_url'>,
): LocationMedia[] {
  const media: LocationMedia[] = galleryPhotos(location).map((coverUrl) => ({ coverUrl }));
  if (location.reel_url) {
    media.push({ coverUrl: reelCoverPhoto(location), reelUrl: location.reel_url });
  }
  return media;
}
