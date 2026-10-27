import { describe, expect, it } from 'vitest';
import { newlyClosedPermanently } from '../../supabase/functions/sync-opening-hours/closed-alert.ts';
import { matchesOpenNow } from '@/lib/openingHours';

describe('newlyClosedPermanently', () => {
  const a = { id: 'a', name: 'A', city: 'Nantes' };
  const b = { id: 'b', name: 'B', city: null };
  it('signale un lieu qui vient de passer en fermé définitivement', () => {
    const prev = new Map<string, string | null>([['a', 'OPERATIONAL'], ['b', null]]);
    expect(newlyClosedPermanently(prev, [a, b])).toEqual([
      { name: 'A', city: 'Nantes' },
      { name: 'B', city: null },
    ]);
  });
  it('ne renvoie pas un lieu déjà signalé à la synchro précédente', () => {
    const prev = new Map<string, string | null>([['a', 'CLOSED_PERMANENTLY'], ['b', 'OPERATIONAL']]);
    expect(newlyClosedPermanently(prev, [a, b])).toEqual([{ name: 'B', city: null }]);
  });
  it('ne signale rien quand aucun lieu n\'est fermé', () => {
    expect(newlyClosedPermanently(new Map(), [])).toEqual([]);
  });
});

describe('matchesOpenNow avec statut Google', () => {
  const wed1400 = new Date(Date.UTC(2026, 9, 7, 12, 0));
  it('écarte un lieu fermé temporairement ou définitivement, avec ou sans horaires', () => {
    expect(matchesOpenNow(null, true, wed1400, 'CLOSED_TEMPORARILY')).toBe(false);
    expect(matchesOpenNow(null, true, wed1400, 'CLOSED_PERMANENTLY')).toBe(false);
    const open = { periods: [{ open: { day: 3, hour: 9, minute: 0 }, close: { day: 3, hour: 18, minute: 0 } }] };
    expect(matchesOpenNow(open, true, wed1400, 'CLOSED_TEMPORARILY')).toBe(false);
  });
  it('garde les lieux opérationnels ou de statut inconnu', () => {
    expect(matchesOpenNow(null, true, wed1400, 'OPERATIONAL')).toBe(true);
    expect(matchesOpenNow(null, true, wed1400, null)).toBe(true);
  });
  it('ne filtre rien quand la bascule est éteinte', () => {
    expect(matchesOpenNow(null, false, wed1400, 'CLOSED_PERMANENTLY')).toBe(true);
  });
});
