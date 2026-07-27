import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventSortRank, isPastEvent, isShortEvent } from '@/lib/weekend';

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

describe('eventSortRank — courts, puis longs, puis terminés', () => {
  const atelierDuJour = { date_start: '2026-07-30', date_end: null };
  const weekEnd = { date_start: '2026-08-01', date_end: '2026-08-02' };
  const expoDeLEte = { date_start: '2026-05-05', date_end: '2026-08-05' };
  const atelierDeLundi = { date_start: '2026-07-27', date_end: null };

  it('classe court < long < terminé', () => {
    expect(eventSortRank(atelierDuJour.date_start, atelierDuJour.date_end)).toBe(0);
    expect(eventSortRank(expoDeLEte.date_start, expoDeLEte.date_end)).toBe(1);
    expect(eventSortRank(atelierDeLundi.date_start, atelierDeLundi.date_end)).toBe(2);
  });

  it('remonte les events du jour au-dessus d’une expo démarrée en mai', () => {
    const mondayISO = '2026-07-27';
    const sorted = [expoDeLEte, atelierDeLundi, weekEnd, atelierDuJour]
      .slice()
      .sort((a, b) => {
        const ra = eventSortRank(a.date_start, a.date_end);
        const rb = eventSortRank(b.date_start, b.date_end);
        if (ra !== rb) return ra - rb;
        const ka = a.date_start < mondayISO ? mondayISO : a.date_start;
        const kb = b.date_start < mondayISO ? mondayISO : b.date_start;
        return ka.localeCompare(kb);
      });

    expect(sorted).toEqual([atelierDuJour, weekEnd, expoDeLEte, atelierDeLundi]);
  });
});
