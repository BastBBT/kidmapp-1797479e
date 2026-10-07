import { describe, expect, it } from 'vitest';
import { matchesOpenNow } from '@/lib/openingHours';

// Mercredi 2026-10-07 12:00 UTC = 14:00 à Paris (heure d'été).
const wed1400 = new Date(Date.UTC(2026, 9, 7, 12, 0));

const day = (d: number, oh: number, ch: number) => ({
  periods: [{ open: { day: d, hour: oh, minute: 0 }, close: { day: d, hour: ch, minute: 0 } }],
});

describe('matchesOpenNow', () => {
  it('ne filtre rien quand la bascule est éteinte', () => {
    expect(matchesOpenNow(day(3, 9, 12), false, wed1400)).toBe(true);
  });
  it('garde un lieu ouvert à 14 h Paris', () => {
    expect(matchesOpenNow(day(3, 9, 18), true, wed1400)).toBe(true);
  });
  it('écarte un lieu dont le créneau est terminé', () => {
    expect(matchesOpenNow(day(3, 9, 12), true, wed1400)).toBe(false);
  });
  it('garde un lieu sans horaires (donnée absente ou malformée)', () => {
    expect(matchesOpenNow(null, true, wed1400)).toBe(true);
    expect(matchesOpenNow({ periods: 'nope' }, true, wed1400)).toBe(true);
  });
  it('garde un lieu ouvert 24h/24', () => {
    expect(matchesOpenNow({ periods: [{ open: { day: 0, hour: 0, minute: 0 } }] }, true, wed1400)).toBe(true);
  });
});
