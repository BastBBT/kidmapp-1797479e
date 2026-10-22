import { describe, expect, it } from 'vitest';
import { ExploreCriteria, ExploreLoc, countExplore, inGroup, matchesExplore } from '@/lib/exploreFilters';

const loc = (id: string, category: string, extra: Partial<ExploreLoc> = {}): ExploreLoc => ({ id, category, lat: 47.2, lng: -1.55, ...extra });

const catalogue: ExploreLoc[] = [
  loc('brunch-cafe', 'cafe'),
  loc('resto-midi', 'restaurant'),
  loc('parc', 'nature', { weather: 'Soleil', duration: '2-3h', is_free: true }),
  loc('musee', 'culture', { weather: 'Tout temps', duration: '1h', is_free: false }),
  loc('piscine', 'sport', { weather: 'Pluie', duration: '1h' }),
];

const base: ExploreCriteria = {
  group: 'places', category: 'all', ageBuckets: new Set(), onlyOpen: false, onlyNearby: false,
  mealId: null, onlyFree: false, weather: null, duration: null,
};

const ctx = {
  now: new Date('2026-10-22T15:00:00'),
  mealLocationIds: (id: string) => new Set(id === 'brunch' ? ['brunch-cafe'] : []),
  isNear: () => true,
};

const ids = (c: ExploreCriteria) => catalogue.filter((l) => matchesExplore(l, c, ctx)).map((l) => l.id);

describe('filtres Explorer', () => {
  it('borne « Tout » au groupe affiché', () => {
    expect(ids(base)).toEqual(['brunch-cafe', 'resto-midi']);
    expect(ids({ ...base, group: 'activities' })).toEqual(['parc', 'musee', 'piscine']);
  });

  it('le repas ne filtre que côté lieux', () => {
    expect(ids({ ...base, mealId: 'brunch' })).toEqual(['brunch-cafe']);
    expect(ids({ ...base, group: 'activities', mealId: 'brunch' })).toHaveLength(3);
  });

  it("« À l'abri » garde aussi ce qui se fait par tous les temps", () => {
    expect(ids({ ...base, group: 'activities', weather: 'Pluie' })).toEqual(['musee', 'piscine']);
  });

  it('compte une option sans toucher aux autres filtres', () => {
    const acts = { ...base, group: 'activities' as const };
    expect(countExplore(catalogue, { ...acts, duration: '1h' }, ctx)).toBe(2);
    expect(countExplore(catalogue, { ...acts, onlyFree: true }, ctx)).toBe(1);
  });

  it("inGroup efface ce qui est propre à l'autre groupe", () => {
    const c = inGroup({ ...base, group: 'activities', category: 'sport', onlyFree: true, weather: 'Pluie', onlyOpen: true }, 'places');
    expect(c).toMatchObject({ group: 'places', category: 'all', onlyFree: false, weather: null, onlyOpen: true });
  });
});
