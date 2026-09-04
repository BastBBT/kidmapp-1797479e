/**
 * Un event convient à un enfant si son âge exact (en mois, aujourd'hui) tombe
 * dans [age_min_months, age_max_months] — bornes nulles = pas de limite de ce
 * côté. Pas besoin de dériver une tranche générique (bébé/petit/grand) : on
 * compare directement un point à un intervalle continu, formule identique à
 * `matchesAgeBucket` (src/lib/ageFilter.ts) dégénérée à min=max=âge exact.
 */
export function ageMatches(ageMonths: number, minMonths: number | null, maxMonths: number | null): boolean {
  if (minMonths !== null && ageMonths < minMonths) return false
  if (maxMonths !== null && ageMonths > maxMonths) return false
  return true
}

/** Âge en mois complets à la date du jour, à partir du mois/année de naissance. */
export function ageInMonths(birthMonth: number, birthYear: number, today: Date = new Date()): number {
  const months = (today.getUTCFullYear() - birthYear) * 12 + (today.getUTCMonth() + 1 - birthMonth)
  return Math.max(0, months)
}
