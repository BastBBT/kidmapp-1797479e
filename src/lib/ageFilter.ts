import type { EquipKey } from '@/assets/icons';

export type AgeBucket = 'all' | '0-2' | '3-5' | '6+';

export const AGE_BUCKETS: { id: AgeBucket; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: '0-2', label: '0-2 ans' },
  { id: '3-5', label: '3-5 ans' },
  { id: '6+', label: '6+ ans' },
];

export const AGE_RANGES: Record<Exclude<AgeBucket, 'all'>, { min: number; max: number }> = {
  '0-2': { min: 0, max: 2 },
  '3-5': { min: 3, max: 5 },
  '6+': { min: 6, max: 99 },
};

// Priority equipment for each age bucket (used for scoring + highlighting).
export const PRIORITY_EQUIP: Record<Exclude<AgeBucket, 'all'>, EquipKey[]> = {
  '0-2': ['changing_table', 'high_chair'],
  '3-5': ['high_chair', 'kids_menu', 'kids_area'],
  '6+': ['kids_area', 'kids_menu'],
};

type AgedLoc = {
  age_min?: number | null;
  age_max?: number | null;
  high_chair?: boolean | null;
  changing_table?: boolean | null;
  kids_area?: boolean | null;
  kids_menu?: boolean | null;
};

/**
 * Age overlap: a location with null/null ages is treated as "all ages" and
 * ALWAYS matches (never hidden). Otherwise use overlap:
 *   (age_min ?? 0) <= bucket.max AND (age_max ?? 99) >= bucket.min
 */
export const matchesAgeBucket = (loc: AgedLoc, bucket: AgeBucket): boolean => {
  if (bucket === 'all') return true;
  const range = AGE_RANGES[bucket];
  const lmin = loc.age_min ?? 0;
  const lmax = loc.age_max ?? 99;
  return lmin <= range.max && lmax >= range.min;
};

/** Higher score = better fit for the current bucket. 0 when bucket = all. */
export const ageAdequacyScore = (loc: AgedLoc, bucket: AgeBucket): number => {
  if (bucket === 'all') return 0;
  let score = 0;
  for (const key of PRIORITY_EQUIP[bucket]) {
    if (loc[key]) score += 1;
  }
  return score;
};

export const getPriorityEquip = (bucket: AgeBucket): EquipKey[] =>
  bucket === 'all' ? [] : PRIORITY_EQUIP[bucket];

export type AgeVerdict = 'perfect' | 'good' | 'poor';

export const ageVerdict = (
  loc: AgedLoc,
  bucket: Exclude<AgeBucket, 'all'>
): { level: AgeVerdict; matched: number; total: number } => {
  const keys = PRIORITY_EQUIP[bucket];
  const matched = keys.reduce((acc, k) => acc + (loc[k] ? 1 : 0), 0);
  const total = keys.length;
  const level: AgeVerdict = matched === total ? 'perfect' : matched >= 1 ? 'good' : 'poor';
  return { level, matched, total };
};
