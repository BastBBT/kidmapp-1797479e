export interface ZoneReference {
  label: string;
  kind: 'commune' | 'quartier' | 'secteur';
  lat: number;
  lng: number;
}

// Emoji décoratif uniquement — JAMAIS stocké dans `label` (la valeur
// persistée sur profiles.zone_city/zone_district reste le label exact tel
// qu'en base). Libellés relevés en base le 2026-09-13 (clé anon) plutôt que
// recopiés depuis iOS : apostrophe droite confirmée (pas typographique).
const SECTEUR_EMOJIS: Record<string, string> = {
  'Nantes Métropole': '🏙️',
  'Vignoble nantais': '🍇',
  'Pays de Retz': '🌾',
  "Presqu'île guérandaise": '🌊',
  "Pays d'Ancenis": '🚣',
  'Sud Loire · Grand-Lieu': '🦆',
};

export const zoneMenuLabel = (zone: ZoneReference): string => {
  const emoji = zone.kind === 'secteur' ? SECTEUR_EMOJIS[zone.label] : undefined;
  return emoji ? `${emoji} ${zone.label}` : zone.label;
};

// Mesuré sur le catalogue publié (265 lieux, 2026-09-11) : à 12km un secteur
// périphérique comme Pays de Retz ne remonte aucun lieu, contre 40 à 30km.
export const SECTEUR_MIN_RADIUS_KM = 30;

/**
 * Rayon à appliquer après un changement de ZONE (jamais après un simple
 * changement de rayon) : un secteur élargit le rayon courant à 30km s'il
 * était plus petit, et ne le rétrécit jamais (un rayon déjà plus grand est
 * un choix délibéré). Miroir de `radiusForZoneChange` (iOS/Android).
 */
export const radiusForZoneChange = (zones: ZoneReference[], label: string, current: number): number => {
  const zone = zones.find((z) => z.label === label);
  if (zone?.kind === 'secteur') return Math.max(current, SECTEUR_MIN_RADIUS_KM);
  return current;
};

export interface ZoneUpdatePayload {
  zone_city: string;
  zone_district: string | null;
  zone_lat: number;
  zone_lng: number;
  zone_radius_km: number;
}

/**
 * Construit le payload d'update `profiles` pour un changement de zone.
 * Extrait en fonction pure et exportée pour un test unitaire dédié : la clé
 * `zone_district` doit TOUJOURS être présente, y compris `null` — jamais
 * construite de façon conditionnelle (`...(district ? {...} : {})`), sinon
 * PostgREST traite la clé absente comme "ne pas toucher à la colonne" et un
 * ancien quartier reste bloqué en base indéfiniment (bug réel corrigé côté
 * iOS, cf. commentaire dans `useProfileSettings.ts`).
 */
export const buildZoneUpdatePayload = (input: {
  city: string;
  district: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
}): ZoneUpdatePayload => ({
  zone_city: input.city,
  zone_district: input.district,
  zone_lat: input.lat,
  zone_lng: input.lng,
  zone_radius_km: input.radiusKm,
});
