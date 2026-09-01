// Âge conseillé stocké en mois (age_min_months / age_max_months), comme sur
// iOS (AgeFormat/AgeUnit, AgeBand.swift) et Android (age_band.dart).

export type AgeUnit = 'years' | 'months';

export const ageToMonths = (value: number, unit: AgeUnit): number =>
  unit === 'years' ? value * 12 : value;

/**
 * Convertit un âge issu d'une contribution (JSONB `contributions.content.activity`)
 * en mois. Les contributions écrites avant le 31/08/2026 sont en années, sans
 * marqueur d'unité — seules celles portant `age_unit: 'months'` (écrites depuis)
 * sont déjà en mois. Absence de marqueur = traité comme années (×12).
 */
export const contributionAgeToMonths = (value: number | null | undefined, ageUnit: unknown): number | null =>
  value == null ? null : ageToMonths(value, ageUnit === 'months' ? 'months' : 'years');

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
 * Valide une paire de champs âge saisis en texte, dans l'unité choisie.
 * Miroir de `ageError` (ProposeLocationSheet.swift côté iOS) : aucun de ces
 * formulaires web n'est un <form>, donc les attributs min/max HTML ne
 * bloquent jamais rien — cette fonction est le seul vrai garde-fou.
 */
export const ageRangeError = (minValue: string, maxValue: string, unit: AgeUnit): string | null => {
  const trimmedMin = minValue.trim();
  const trimmedMax = maxValue.trim();
  const minV = trimmedMin === '' ? null : Number(trimmedMin);
  const maxV = trimmedMax === '' ? null : Number(trimmedMax);
  if (trimmedMin !== '' && (minV === null || Number.isNaN(minV))) return 'Âge invalide';
  if (trimmedMax !== '' && (maxV === null || Number.isNaN(maxV))) return 'Âge invalide';
  const maxAllowed = unit === 'years' ? 99 : 36;
  const rangeMsg = unit === 'years' ? 'Âge entre 0 et 99 ans' : 'Âge entre 0 et 36 mois';
  if (minV != null && (minV < 0 || minV > maxAllowed)) return rangeMsg;
  if (maxV != null && (maxV < 0 || maxV > maxAllowed)) return rangeMsg;
  if (minV != null && maxV != null && maxV < minV) return "L'âge max doit être ≥ l'âge min";
  return null;
};

/**
 * Pré-remplit un formulaire d'édition à partir de valeurs en mois : si les deux
 * bornes définies sont des années pleines (≥ 24 et multiples de 12), l'unité
 * "ans" est plus lisible pour l'admin ; sinon on reste en mois pour ne pas
 * perdre de précision (ex: 18 mois reste affiché "18 mois", pas "2 ans" faux).
 * Sans aucune borne définie (fiche/proposition sans âge), on retombe sur "ans"
 * — c'est aussi l'unité par défaut du formulaire de création, à ne pas
 * désaccorder entre "créer" et "éditer une fiche vierge".
 */
export const monthsPairToDraft = (
  min?: number | null,
  max?: number | null
): { minValue: string; maxValue: string; unit: AgeUnit } => {
  const defined = [min, max].filter((v): v is number => v != null);
  const allCleanYears = defined.every((v) => v >= 24 && v % 12 === 0);
  const unit: AgeUnit = allCleanYears ? 'years' : 'months';
  const toDraft = (v?: number | null) => (v == null ? '' : String(unit === 'years' ? v / 12 : v));
  return { minValue: toDraft(min), maxValue: toDraft(max), unit };
};

/**
 * Convertit une valeur de champ (texte) d'une unité vers une autre, pour le
 * toggle ans/mois d'AgeRangeInput — sans ça, changer l'unité change juste
 * l'interprétation du nombre déjà saisi (12 "mois" devient 12 "ans" au clic).
 */
export const convertAgeDraftValue = (value: string, fromUnit: AgeUnit, toUnit: AgeUnit): string => {
  if (value.trim() === '' || fromUnit === toUnit) return value;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return value;
  const months = ageToMonths(n, fromUnit);
  return String(toUnit === 'years' ? Math.round(months / 12) : months);
};
