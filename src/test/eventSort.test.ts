import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isPastEvent, isShortEvent } from '@/lib/weekend';

// Semaine de référence : lundi 27/07/2026 → dimanche 02/08. On se place au
// jeudi 30, pour qu'une partie de la semaine soit déjà passée.
const THURSDAY = new Date('2026-07-30T10:00:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(THURSDAY);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('isShortEvent', () => {
  it('traite un événement sans date de fin comme court', () => {
    expect(isShortEvent('2026-07-30', null)).toBe(true);
  });

  it('traite un week-end (2 jours) comme court', () => {
    expect(isShortEvent('2026-08-01', '2026-08-02')).toBe(true);
  });

  it('accepte jusqu’à 3 jours d’écart', () => {
    expect(isShortEvent('2026-07-30', '2026-08-02')).toBe(true);
  });

  it('traite une expo de plusieurs mois comme longue', () => {
    expect(isShortEvent('2026-05-05', '2026-08-05')).toBe(false);
  });
});

describe('isPastEvent', () => {
  it('considère terminé un événement dont la fin est passée', () => {
    expect(isPastEvent('2026-07-27', '2026-07-28')).toBe(true);
  });

  it('garde « en cours » un événement long dont la fin est à venir', () => {
    expect(isPastEvent('2026-05-05', '2026-08-05')).toBe(false);
  });

  it('garde « en cours » un événement du jour', () => {
    expect(isPastEvent('2026-07-30', null)).toBe(false);
  });
});
