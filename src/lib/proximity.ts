/**
 * Zone de proximité (« Proche de moi ») : disque autour duquel un lieu ou une sortie est
 * jugé proche — le point et le rayon de la zone du profil famille. Sans profil ou sans
 * zone (visiteur, compte jamais configuré) : Nantes centre + 20 km, soit à peu près
 * l'emprise de Nantes Métropole. Ce n'est pas de la géolocalisation : la distance part
 * de la zone déclarée. Miroir de `ProximityZone` (iOS) / `proximity_zone.dart` (Android).
 */
export interface ProximityZone {
  lat: number;
  lng: number;
  radiusKm: number;
}

export const NANTES_ZONE: ProximityZone = { lat: 47.2184, lng: -1.5536, radiusKm: 20 };

export interface FarInfo {
  city: string | null;
  km: number;
}

/** Sans point ou sans rayon, on retombe sur Nantes centre : une zone à moitié connue ne sert à rien. */
export const zoneFromParts = (
  lat: number | null | undefined,
  lng: number | null | undefined,
  radiusKm: number | null | undefined,
): ProximityZone => {
  if (lat == null || lng == null || radiusKm == null) return NANTES_ZONE;
  return { lat, lng, radiusKm };
};

export const zoneFromSettings = (
  settings: { zoneLat: number | null; zoneLng: number | null; zoneRadiusKm: number } | null | undefined,
): ProximityZone => zoneFromParts(settings?.zoneLat, settings?.zoneLng, settings?.zoneRadiusKm);

/** Des coordonnées à 0,0 sont un point jamais saisi, pas le golfe de Guinée. */
const hasCoords = (lat: number | null | undefined, lng: number | null | undefined): boolean =>
  lat != null && lng != null && !(lat === 0 && lng === 0);

/** Distance à vol d'oiseau (haversine), en km. */
export const distanceKm = (zone: ProximityZone, lat: number, lng: number): number => {
  const r = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - zone.lat);
  const dLng = rad(lng - zone.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(zone.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * Une adresse se lit « …, 44210 Pornic » : c'est la ville la plus fiable, plus que la
 * colonne `city`. Saisie en minuscules (« ancenis saint gereon ») ou en capitales, on remet les majuscules.
 */
export const cityFromAddress = (address: string | null | undefined): string | null => {
  // Tolère « , France » en queue et « Cedex » (« 44000 Nantes Cedex 1 »).
  const m = address?.match(/\b\d{5}\s+([^,\d][^,]*?)(?:\s+cedex(?:\s+\d+)?)?(?:,\s*France)?\s*$/i);
  const city = m?.[1]?.trim();
  if (!city) return null;
  const lower = city.toLowerCase();
  return city === lower || city === city.toUpperCase()
    ? lower.replace(/(^|[\s-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase())
    : city;
};

/**
 * La colonne `city` vaut « Nantes » par défaut, y compris pour des lieux d'Angers ou de
 * Talmont : on ne croit « Nantes » que dans l'emprise de la métropole. Sinon, la distance
 * seule est affichée plutôt qu'une ville fausse.
 */
export const cityLabel = (
  loc: { lat: number; lng: number; city?: string | null; address?: string | null },
): string | null => {
  const fromAddress = cityFromAddress(loc.address);
  if (fromAddress) return fromAddress;
  const city = loc.city?.trim();
  if (!city) return null;
  if (city.toLowerCase() === 'nantes' && distanceKm(NANTES_ZONE, loc.lat, loc.lng) > NANTES_ZONE.radiusKm) return null;
  return city;
};

/** `null` quand le lieu est dans la zone. */
export const locationFarInfo = (
  zone: ProximityZone,
  loc: { lat: number; lng: number; city?: string | null; address?: string | null },
): FarInfo | null => {
  if (!hasCoords(loc.lat, loc.lng)) return null;
  const d = distanceKm(zone, loc.lat, loc.lng);
  if (d <= zone.radiusKm) return null;
  return { city: cityLabel(loc), km: Math.round(d) };
};

/**
 * `null` quand la sortie est dans la zone — ou que ses coordonnées manquent : on ne sait
 * pas, on ne la déclare pas lointaine.
 */
export const eventFarInfo = (
  zone: ProximityZone,
  ev: { lat: number | null; lng: number | null; address?: string | null },
): FarInfo | null => {
  if (ev.lat == null || ev.lng == null || !hasCoords(ev.lat, ev.lng)) return null;
  const d = distanceKm(zone, ev.lat, ev.lng);
  if (d <= zone.radiusKm) return null;
  return { city: cityFromAddress(ev.address), km: Math.round(d) };
};
