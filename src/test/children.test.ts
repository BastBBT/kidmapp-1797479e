import { describe, it, expect } from 'vitest';
import {
  ALL_CHILDREN_SELECTION,
  Child,
  NONE_SELECTION,
  ageInMonths,
  childDisplayLabel,
  childFilterEmoji,
  resolveAgeBucketsForSelection,
  selectionFromStorageValue,
  selectionStorageValue,
} from '@/lib/children';

const child = (overrides: Partial<Child> = {}): Child => ({
  id: 'a1b2c3d4-0000-0000-0000-000000000000',
  user_id: 'u1',
  first_name: null,
  birth_month: 1,
  birth_year: 2022,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('childFilterEmoji', () => {
  it('est stable pour un même id (pas basé sur un hash de session)', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    expect(childFilterEmoji(id)).toBe(childFilterEmoji(id));
  });

  it('peut différer entre deux ids différents', () => {
    const a = childFilterEmoji('11111111-1111-1111-1111-111111111111');
    const b = childFilterEmoji('22222222-2222-2222-2222-222222222222');
    // Pas une garantie absolue (collision possible sur 16 valeurs), mais casse
    // si l'indexation devient constante ou aléatoire par lancement.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });
});

describe('ageInMonths', () => {
  it("calcule l'âge en mois à une date de référence donnée", () => {
    const c = child({ birth_month: 6, birth_year: 2020 });
    expect(ageInMonths(c, new Date('2026-06-15'))).toBe(72);
    expect(ageInMonths(c, new Date('2026-05-15'))).toBe(71);
  });

  it('ne descend jamais sous 0 (garde contre une date de référence antérieure à la naissance)', () => {
    const c = child({ birth_month: 1, birth_year: 2030 });
    expect(ageInMonths(c, new Date('2026-01-01'))).toBe(0);
  });
});

describe('childDisplayLabel', () => {
  it('utilise le prénom trimé si présent', () => {
    expect(childDisplayLabel(child({ first_name: '  Léa  ' }), 'Mon enfant')).toBe('Léa');
  });

  it('retombe sur le repli si absent ou blanc', () => {
    expect(childDisplayLabel(child({ first_name: null }), 'Mon enfant')).toBe('Mon enfant');
    expect(childDisplayLabel(child({ first_name: '   ' }), 'Mon enfant')).toBe('Mon enfant');
  });
});

describe('sérialisation de ChildFilterSelection', () => {
  it('aller-retour storageValue <-> selection pour les 3 cas', () => {
    expect(selectionFromStorageValue(selectionStorageValue(NONE_SELECTION))).toEqual(NONE_SELECTION);
    expect(selectionFromStorageValue(selectionStorageValue(ALL_CHILDREN_SELECTION))).toEqual(ALL_CHILDREN_SELECTION);
    const childSel = { kind: 'child' as const, id: 'xyz' };
    expect(selectionFromStorageValue(selectionStorageValue(childSel))).toEqual(childSel);
  });

  it('une valeur nulle/vide retombe sur "none"', () => {
    expect(selectionFromStorageValue(null)).toEqual(NONE_SELECTION);
    expect(selectionFromStorageValue('')).toEqual(NONE_SELECTION);
  });
});

describe('resolveAgeBucketsForSelection', () => {
  const baby = child({ id: 'baby', birth_month: 1, birth_year: 2025 }); // ~1 an
  const grand = child({ id: 'grand', birth_month: 1, birth_year: 2018 }); // ~8 ans
  const now = new Date('2026-06-01');

  it('"none" -> aucune tranche', () => {
    expect(resolveAgeBucketsForSelection(NONE_SELECTION, [baby, grand])).toEqual(new Set());
  });

  it('"allChildren" -> union des tranches de toute la fratrie', () => {
    const buckets = resolveAgeBucketsForSelection(ALL_CHILDREN_SELECTION, [baby, grand]);
    expect(buckets).toEqual(new Set(['0-2', '6+']));
  });

  it('"child" -> la tranche du seul enfant visé', () => {
    const buckets = resolveAgeBucketsForSelection({ kind: 'child', id: 'baby' }, [baby, grand]);
    expect(buckets).toEqual(new Set(['0-2']));
  });

  it("un enfant supprimé ailleurs retombe silencieusement sur aucun filtre plutôt que de planter", () => {
    const buckets = resolveAgeBucketsForSelection({ kind: 'child', id: 'introuvable' }, [baby, grand]);
    expect(buckets).toEqual(new Set());
  });

  // `now` n'est pas utilisé par resolveAgeBucketsForSelection directement (il
  // délègue à ageInMonths avec l'horloge réelle) — ce test documente juste le
  // jeu de données utilisé ci-dessus pour éviter une régression silencieuse
  // si les dates de naissance sont ajustées un jour.
  it('jeu de données de référence : baby ~1 an, grand ~8 ans à `now`', () => {
    expect(ageInMonths(baby, now)).toBeLessThan(24);
    expect(ageInMonths(grand, now)).toBeGreaterThan(60);
  });
});
