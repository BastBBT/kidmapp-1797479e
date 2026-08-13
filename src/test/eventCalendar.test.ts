import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildSlots,
  defaultSelectedDay,
  distinctEvents,
  eventsWindowFilter,
  longEventsOn,
  populatedMonths,
  shortSlotsByDay,
  shortSlotsOn,
  weekSlots,
} from '@/lib/eventCalendar';
import { EventItem, EventOccurrence } from '@/types/event';

// Jeudi 13/08/2026 comme « aujourd'hui » : une partie des dates de test est
// derrière, une partie devant.
const THURSDAY = new Date('2026-08-13T10:00:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(THURSDAY);
});
afterEach(() => {
  vi.useRealTimers();
});

const ev = (
  id: string,
  date_start: string,
  extra: Partial<EventItem> = {},
): EventItem =>
  ({
    id,
    name: id,
    category: 'Atelier',
    date_start,
    date_end: null,
    time: null,
    status: 'published',
    ...extra,
  }) as EventItem;

const occ = (
  event_id: string,
  date_start: string,
  extra: Partial<EventOccurrence> = {},
): EventOccurrence => ({
  id: `${event_id}-${date_start}`,
  event_id,
  date_start,
  date_end: null,
  time: null,
  ...extra,
});

describe('buildSlots', () => {
  it('retombe sur les dates de l’event quand aucun créneau n’est chargé', () => {
    const slots = buildSlots([ev('a', '2026-08-15', { time: '15h00' })], {});

    expect(slots).toHaveLength(1);
    expect(slots[0].occurrence.date_start).toBe('2026-08-15');
    expect(slots[0].occurrence.time).toBe('15h00');
  });

  it('déplie un event en autant de créneaux qu’il en porte', () => {
    const slots = buildSlots([ev('contes', '2026-08-15')], {
      contes: [occ('contes', '2026-08-15'), occ('contes', '2026-08-22'), occ('contes', '2026-08-29')],
    });

    expect(slots.map((s) => s.occurrence.date_start)).toEqual([
      '2026-08-15',
      '2026-08-22',
      '2026-08-29',
    ]);
  });
});

describe('shortSlotsByDay', () => {
  it('pose une pastille par créneau, pas une par event', () => {
    // `date_start` de l'event ne porte que le créneau le plus proche : c'est
    // exactement le cas qui n'affichait qu'une seule pastille.
    const slots = buildSlots([ev('contes', '2026-08-15')], {
      contes: [occ('contes', '2026-08-15'), occ('contes', '2026-08-22'), occ('contes', '2026-08-29')],
    });
    const byDay = shortSlotsByDay(slots);

    expect(Object.keys(byDay).sort()).toEqual(['2026-08-15', '2026-08-22', '2026-08-29']);
    expect(byDay['2026-08-22'][0].occurrence.date_start).toBe('2026-08-22');
  });

  it('un créneau de week-end peuple chacun de ses jours', () => {
    const slots = buildSlots([ev('we', '2026-08-15')], {
      we: [occ('we', '2026-08-15', { date_end: '2026-08-16' })],
    });

    expect(Object.keys(shortSlotsByDay(slots)).sort()).toEqual(['2026-08-15', '2026-08-16']);
  });

  it('laisse les créneaux longs hors de la grille', () => {
    const slots = buildSlots([ev('mix', '2026-07-01', { date_end: '2026-09-30' })], {
      mix: [
        occ('mix', '2026-07-01', { date_end: '2026-09-30' }),
        occ('mix', '2026-08-15'),
      ],
    });

    expect(Object.keys(shortSlotsByDay(slots))).toEqual(['2026-08-15']);
    expect(longEventsOn(slots, '2026-08-13').map((e) => e.id)).toEqual(['mix']);
  });

  it('ne compte qu’une fois un event à deux créneaux longs', () => {
    const slots = buildSlots([ev('expo', '2026-07-01', { date_end: '2026-09-30' })], {
      expo: [
        { ...occ('expo', '2026-07-01', { date_end: '2026-09-30' }), id: 'a' },
        { ...occ('expo', '2026-07-05', { date_end: '2026-09-20' }), id: 'b' },
      ],
    });

    expect(longEventsOn(slots, '2026-08-13').map((e) => e.id)).toEqual(['expo']);
  });
});

describe('shortSlotsOn', () => {
  it('trie par horaire du créneau', () => {
    const slots = buildSlots([ev('a', '2026-08-15'), ev('b', '2026-08-15')], {
      a: [occ('a', '2026-08-15', { time: '15h00' })],
      b: [occ('b', '2026-08-15', { time: '09h30' })],
    });

    expect(shortSlotsOn(shortSlotsByDay(slots), '2026-08-15').map((s) => s.event.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('ne marque « terminé » que le créneau réellement passé', () => {
    // Le trigger de synchro n'est pas rejoué chaque jour : la date portée par
    // l'event peut être périmée alors qu'un créneau est encore à venir.
    const slots = buildSlots([ev('serie', '2026-08-10')], {
      serie: [occ('serie', '2026-08-10'), occ('serie', '2026-08-20')],
    });
    const byDay = shortSlotsByDay(slots);

    expect(shortSlotsOn(byDay, '2026-08-10')[0].occurrence.date_start).toBe('2026-08-10');
    expect(shortSlotsOn(byDay, '2026-08-20')[0].occurrence.date_start).toBe('2026-08-20');
    expect(defaultSelectedDay(byDay)).toBe('2026-08-20');
  });
});

describe('weekSlots', () => {
  // Semaine du lundi 17 au dimanche 23 août 2026, entièrement à venir.
  const week = { monday: new Date(2026, 7, 17), sunday: new Date(2026, 7, 23) } as never;

  it('ne retient que les créneaux qui traversent la semaine', () => {
    const slots = buildSlots([ev('contes', '2026-08-15')], {
      contes: [occ('contes', '2026-08-15'), occ('contes', '2026-08-19'), occ('contes', '2026-08-26')],
    });

    expect(weekSlots(slots, week).map((s) => s.occurrence.date_start)).toEqual(['2026-08-19']);
  });

  it('garde les deux créneaux d’une même semaine, dans l’ordre des dates', () => {
    const slots = buildSlots([ev('atelier', '2026-08-18')], {
      atelier: [occ('atelier', '2026-08-22'), occ('atelier', '2026-08-18')],
    });

    expect(weekSlots(slots, week).map((s) => s.occurrence.date_start)).toEqual([
      '2026-08-18',
      '2026-08-22',
    ]);
    // La mini-carte, elle, ne veut qu'un marqueur par lieu.
    expect(distinctEvents(weekSlots(slots, week)).map((e) => e.id)).toEqual(['atelier']);
  });

  it('place les créneaux longs après les courts', () => {
    const slots = buildSlots(
      [ev('expo', '2026-07-01', { date_end: '2026-09-30' }), ev('atelier', '2026-08-20')],
      {
        expo: [occ('expo', '2026-07-01', { date_end: '2026-09-30' })],
        atelier: [occ('atelier', '2026-08-20')],
      },
    );

    expect(weekSlots(slots, week).map((s) => s.event.id)).toEqual(['atelier', 'expo']);
  });
});

describe('populatedMonths', () => {
  it('rend navigable le mois d’un créneau lointain', () => {
    const slots = buildSlots([ev('serie', '2026-08-15')], {
      serie: [occ('serie', '2026-08-15'), occ('serie', '2026-10-10')],
    });

    expect(populatedMonths(slots)).toEqual(['2026-08-01', '2026-10-01']);
  });

  it('garde le mois courant même sans créneau', () => {
    expect(populatedMonths([])).toEqual(['2026-08-01']);
  });
});

describe('eventsWindowFilter', () => {
  const since = '2026-08-03';
  const today = '2026-08-13';

  it('sans ids, retombe exactement sur le filtre porté par l’event', () => {
    expect(eventsWindowFilter(since, today)).toBe(
      'date_start.gte.2026-08-03,date_end.gte.2026-08-13',
    );
  });

  it('ajoute le terme de rattrapage quand des events ont un créneau dans la fenêtre', () => {
    expect(eventsWindowFilter(since, today, ['a1', 'b2'])).toBe(
      'date_start.gte.2026-08-03,date_end.gte.2026-08-13,id.in.(a1,b2)',
    );
  });

  it('garde le filet event-level à côté du rattrapage', () => {
    // Un event sans ligne dans event_occurrences n'est dans aucun id : il doit
    // rester joignable par ses propres dates, sinon il disparaît de la liste.
    const f = eventsWindowFilter(since, today, ['a1']);
    expect(f.startsWith('date_start.gte.2026-08-03,date_end.gte.2026-08-13')).toBe(true);
  });
});
