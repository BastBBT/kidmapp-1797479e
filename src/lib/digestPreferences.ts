// Préférences de la sélection hebdo (jours dispo, vacances, types). Le filtrage
// lui-même vit côté serveur (supabase/functions/_shared/digest/preferences.ts) ;
// ici, seulement ce dont l'écran Mon compte a besoin.

export type DigestDays = 'weekend' | 'wed_weekend' | 'all';

export const DIGEST_DAYS_OPTIONS: DigestDays[] = ['weekend', 'wed_weekend', 'all'];

/** Même vocabulaire que la contrainte events_category_check. */
export const EVENT_CATEGORIES = ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Marché', 'Exposition', 'Autre'];

/** Même vocabulaire que la contrainte locations_category_check, ordre d'affichage
 *  du réglage (les lieux « sortie » d'abord). */
export const LOCATION_CATEGORIES = [
  'public', 'nature', 'sport', 'creatif', 'culture', 'jeux', 'librairie', 'restaurant', 'cafe', 'shop', 'coiffeur',
];

export function parseDigestDays(value: string | null | undefined): DigestDays {
  return value === 'weekend' || value === 'wed_weekend' ? value : 'all';
}

/**
 * Coche/décoche une catégorie. `null` en base = toutes cochées : on y revient
 * dès que tout est coché, et on n'écrit jamais de tableau vide (la contrainte
 * l'interdit) — décocher la dernière catégorie ne fait rien.
 */
export function toggleCategory(current: string[] | null, all: string[], id: string): string[] | null {
  const effective = current && current.length > 0 ? current : all;
  const isOn = effective.includes(id);
  if (isOn && effective.length === 1) return current;
  const next = all.filter((c) => (c === id ? !isOn : effective.includes(c)));
  return next.length === all.length ? null : next;
}

export function isCategoryOn(current: string[] | null, id: string): boolean {
  return !current || current.length === 0 || current.includes(id);
}
