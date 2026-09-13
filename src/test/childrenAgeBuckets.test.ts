import { describe, it, expect } from 'vitest';
import {
  ChildAgeBucket,
  ageAdequacyScoreForBuckets,
  bucketForChildMonths,
  getPriorityEquipForBuckets,
  matchesAgeBuckets,
} from '@/lib/ageFilter';

// bucketForChildMonths dérive des mêmes bornes AGE_RANGES que le filtrage
// (0-2: 0..24, 3-5: 36..60 mais catégorisation continue 24..60, 6+: >60) —
// verrouille les bornes exactes pour ne jamais diverger d'iOS/Android.
describe('bucketForChildMonths', () => {
  it('catégorise un âge exact aux bornes', () => {
    expect(bucketForChildMonths(0)).toBe('0-2');
    expect(bucketForChildMonths(23)).toBe('0-2');
    expect(bucketForChildMonths(24)).toBe('3-5'); // pas 0-2 : bascule exactement à 24
    expect(bucketForChildMonths(60)).toBe('3-5');
    expect(bucketForChildMonths(61)).toBe('6+');
    expect(bucketForChildMonths(200)).toBe('6+');
  });
});

const loc = (overrides: Partial<Record<string, unknown>> = {}) => ({
  age_min_months: null,
  age_max_months: null,
  high_chair: false,
  changing_table: false,
  kids_area: false,
  kids_menu: false,
  ...overrides,
});

describe('matchesAgeBuckets (union, jamais intersection)', () => {
  it('ensemble vide = pas de filtre, tout matche', () => {
    expect(matchesAgeBuckets(loc({ age_min_months: 36, age_max_months: 60 }), new Set())).toBe(true);
  });

  it('un lieu 3-5 ne matche pas 0-2 seul', () => {
    const buckets = new Set<ChildAgeBucket>(['0-2']);
    expect(matchesAgeBuckets(loc({ age_min_months: 36, age_max_months: 60 }), buckets)).toBe(false);
  });

  it('union : matche dès qu\'UNE des tranches actives convient (fratrie 0-2 et 6+)', () => {
    const buckets = new Set<ChildAgeBucket>(['0-2', '6+']);
    // Un lieu 3-5 seul ne convient à aucun des deux enfants.
    expect(matchesAgeBuckets(loc({ age_min_months: 36, age_max_months: 60 }), buckets)).toBe(false);
    // Un lieu 0-2 convient au premier enfant.
    expect(matchesAgeBuckets(loc({ age_min_months: 0, age_max_months: 24 }), buckets)).toBe(true);
  });

  it('un objet sans borne d\'âge reste visible dans toutes les tranches', () => {
    expect(matchesAgeBuckets(loc(), new Set<ChildAgeBucket>(['0-2']))).toBe(true);
  });
});

describe('ageAdequacyScoreForBuckets (meilleur score, pas la somme)', () => {
  it('retient le max parmi les tranches actives', () => {
    const l = loc({ high_chair: true, changing_table: true, kids_area: true, kids_menu: true });
    const single = ageAdequacyScoreForBuckets(l, new Set<ChildAgeBucket>(['0-2']));
    const both = ageAdequacyScoreForBuckets(l, new Set<ChildAgeBucket>(['0-2', '6+']));
    // '0-2' seul et '0-2'+'6+' doivent donner le même score max, pas une somme.
    expect(both).toBe(single);
  });

  it('0 quand aucune tranche active', () => {
    expect(ageAdequacyScoreForBuckets(loc({ high_chair: true }), new Set())).toBe(0);
  });
});

describe('getPriorityEquipForBuckets (union des équipements prioritaires)', () => {
  it('fusionne les équipements de chaque tranche active sans doublon', () => {
    const equip = getPriorityEquipForBuckets(new Set<ChildAgeBucket>(['0-2', '3-5']));
    expect(equip).toContain('changing_table');
    expect(equip).toContain('high_chair');
    expect(equip).toContain('kids_menu');
    expect(new Set(equip).size).toBe(equip.length);
  });

  it('vide quand aucune tranche active', () => {
    expect(getPriorityEquipForBuckets(new Set())).toEqual([]);
  });
});
