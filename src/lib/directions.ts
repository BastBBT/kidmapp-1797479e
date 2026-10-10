/** Lien d'itinéraire Google Maps vers un point — partagé par le bouton « Itinéraire » et la mini carte. */
export const directionsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
