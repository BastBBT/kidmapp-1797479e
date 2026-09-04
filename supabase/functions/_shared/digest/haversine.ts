/**
 * Distance en kilomètres entre deux points (lat/lng en degrés), formule de
 * Haversine — suffisant à l'échelle d'un rayon de filtre (5 à 50 km), pas
 * besoin d'une extension Postgres (`cube`/`earthdistance`) pour ce volume.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
