import { describe, expect, it } from 'vitest';
import { forPlatform, rankBy, splitLocations, type TopLocation } from './topPages';

const loc = (name: string, category: string, views30d: number, viewsTotal: number): TopLocation => ({
  id: name, name, category, city: 'Nantes', viewsTotal, views30d, visitors30d: 0,
  byPlatform: {
    web: { views30d, viewsTotal },
    ios: { views30d: 1, viewsTotal: 2 },
    android: { views30d: 0, viewsTotal: 0 },
  },
});

describe('splitLocations', () => {
  it('sépare lieux et activités selon la catégorie', () => {
    const { places, activities } = splitLocations([loc('A', 'restaurant', 1, 1), loc('B', 'nature', 1, 1), loc('C', 'jeux', 1, 1)]);
    expect(places.map((l) => l.name)).toEqual(['A']);
    expect(activities.map((l) => l.name)).toEqual(['B', 'C']);
  });
});

describe('rankBy', () => {
  const rows = [loc('B', 'cafe', 5, 50), loc('A', 'cafe', 5, 50), loc('C', 'cafe', 9, 10), loc('D', 'cafe', 0, 80)];

  it('trie sur les 30 derniers jours, puis le cumul, puis le nom', () => {
    expect(rankBy(rows, 'views30d').map((l) => l.name)).toEqual(['C', 'A', 'B', 'D']);
  });

  it('trie sur le cumul depuis le début', () => {
    expect(rankBy(rows, 'viewsTotal').map((l) => l.name)).toEqual(['D', 'A', 'B', 'C']);
  });

  it('ne modifie pas le tableau d’origine', () => {
    const copy = [...rows];
    rankBy(rows, 'viewsTotal');
    expect(rows).toEqual(copy);
  });
});

describe('forPlatform', () => {
  const rows = [loc('A', 'cafe', 5, 50)];

  it('garde les compteurs de la RPC pour « toutes »', () => {
    expect(forPlatform(rows, 'all')).toBe(rows);
  });

  it('remplace les compteurs par ceux de la plateforme choisie', () => {
    const [ios] = forPlatform(rows, 'ios');
    expect([ios.views30d, ios.viewsTotal]).toEqual([1, 2]);
  });

  it('retombe sur 0 si la ventilation manque (RPC plus ancienne)', () => {
    const [r] = forPlatform([{ ...rows[0], byPlatform: undefined as never }], 'android');
    expect([r.views30d, r.viewsTotal]).toEqual([0, 0]);
  });
});
