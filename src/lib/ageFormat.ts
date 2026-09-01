// Âge conseillé stocké en mois (age_min_months / age_max_months), comme sur
// iOS (AgeFormat/AgeUnit, AgeBand.swift) et Android (age_band.dart).

export type AgeUnit = 'years' | 'months';

export const ageToMonths = (value: number, unit: AgeUnit): number =>
  unit === 'years' ? value * 12 : value;

// "18 mois" sous 2 ans, arrondi en années au-delà ("2 ans", "6 ans").
export const formatAge = (months: number): string => {
  if (months < 24) return `${months} mois`;
  return `${Math.round(months / 12)} ans`;
};

export const formatAgeRange = (min?: number | null, max?: number | null): string => {
  if (min == null && max == null) return 'Tous âges';
  if (max == null) return `Dès ${formatAge(min!)}`;
  if (min == null) return `Jusqu'à ${formatAge(max)}`;
  return `${formatAge(min)} – ${formatAge(max)}`;
};

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

// Équivalent i18n de `formatAge`/`formatAgeRange`, pour les pages publiques
// (LocationPage, EventPage) — `formatAgeRange` reste en français, réservé à
// l'admin (non traduit, comme le reste d'AdminPage.tsx).
const formatAgeI18n = (t: TFunc, months: number): string =>
  months < 24 ? t('common.age_in_months', { age: months }) : t('common.age_in_years', { age: Math.round(months / 12) });

export const formatAgeRangeI18n = (t: TFunc, min?: number | null, max?: number | null): string => {
  if (min == null && max == null) return t('common.age_all');
  if (max == null) return t('common.age_from', { age: formatAgeI18n(t, min!) });
  if (min == null) return t('common.age_up_to', { age: formatAgeI18n(t, max) });
  return t('common.age_range', { min: formatAgeI18n(t, min), max: formatAgeI18n(t, max) });
};

/**
 * Pré-remplit un formulaire d'édition à partir de valeurs en mois : si les deux
 * bornes définies sont des années pleines (≥ 24 et multiples de 12), l'unité
 * "ans" est plus lisible pour l'admin ; sinon on reste en mois pour ne pas
 * perdre de précision (ex: 18 mois affiché "36 mois" plutôt que "3 ans" faux).
 */
export const monthsPairToDraft = (
  min?: number | null,
  max?: number | null
): { minValue: string; maxValue: string; unit: AgeUnit } => {
  const defined = [min, max].filter((v): v is number => v != null);
  const allCleanYears = defined.length > 0 && defined.every((v) => v >= 24 && v % 12 === 0);
  const unit: AgeUnit = allCleanYears ? 'years' : 'months';
  const toDraft = (v?: number | null) => (v == null ? '' : String(unit === 'years' ? v / 12 : v));
  return { minValue: toDraft(min), maxValue: toDraft(max), unit };
};
