import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildSlots,
  defaultSelectedDay,
  distinctEvents,
  eventsWindowFilter,
  longBarsForRow,
  longBarsForWeek,
  longEventsOn,
  populatedMonths,
  weekRowColumns,
  shortSlotsByDay,
  shortSlotsOn,
  weekSlots,
} from '@/lib/eventCalendar';
import { EventItem, EventOccurrence, eventCategoryInk } from '@/types/event';

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

describe('longBarsForWeek', () => {
  // Semaine du lundi 10/08/2026 au dimanche 16/08/2026.
  const MONDAY = '2026-08-10';
  const long = (id: string, start: string, end: string, name = id) =>
    ev(id, start, { name, date_end: end });
  const barsOf = (events: EventItem[], opts?: Parameters<typeof longBarsForWeek>[2]) =>
    longBarsForWeek(buildSlots(events, {}), MONDAY, opts);

  it('pose une barre sur les colonnes traversées, avec ses bords de continuation', () => {
    const { bars } = barsOf([long('expo', '2026-08-01', '2026-09-30')]);
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ startCol: 0, endCol: 6, continuesLeft: true, continuesRight: true, lane: 0 });
  });

  it('borne une barre qui démarre et finit dans la semaine', () => {
    const { bars } = barsOf([long('fete', '2026-08-12', '2026-08-20')]);
    expect(bars[0]).toMatchObject({ startCol: 2, endCol: 6, continuesLeft: false, continuesRight: true });
  });

  it("ignore les créneaux courts et ceux qui ne touchent pas la semaine", () => {
    const { bars, hidden } = barsOf([
      long('court', '2026-08-14', '2026-08-16'),
      long('passe', '2026-06-01', '2026-07-30'),
      long('futur', '2026-09-01', '2026-10-30'),
    ]);
    expect(bars).toHaveLength(0);
    expect(hidden).toHaveLength(0);
  });

  it('range les barres qui se chevauchent sur des lignes distinctes, la 3e passe en hidden', () => {
    const { bars, hidden, laneCount } = barsOf([
      long('a', '2026-08-01', '2026-09-01'),
      long('b', '2026-08-05', '2026-09-01'),
      long('c', '2026-08-08', '2026-09-01'),
    ]);
    expect(bars.map((b) => b.lane).sort()).toEqual([0, 1]);
    expect(hidden.map((e) => e.id)).toEqual(['c']);
    expect(laneCount).toBe(2);
  });

  it('réutilise une ligne quand deux barres ne se chevauchent pas', () => {
    const { bars } = barsOf([
      long('tot', '2026-08-05', '2026-08-11'),
      long('tard', '2026-08-13', '2026-08-30'),
    ]);
    expect(bars.map((b) => b.lane)).toEqual([0, 0]);
  });

  it('une seule barre par event même avec deux créneaux longs', () => {
    const e = ev('serie', '2026-08-01', { name: 'serie', date_end: '2026-08-11' });
    const slots = buildSlots([e], {
      serie: [
        occ('serie', '2026-08-01', { date_end: '2026-08-11' }),
        occ('serie', '2026-08-13', { date_end: '2026-08-25' }),
      ],
    });
    const { bars } = longBarsForWeek(slots, MONDAY);
    expect(bars).toHaveLength(1);
    expect(bars[0]).toMatchObject({ startCol: 0, endCol: 6 });
  });

  it('coupe aux colonnes visibles (semaine partielle d’un mois)', () => {
    const { bars } = barsOf([long('expo', '2026-08-01', '2026-09-30')], { firstCol: 4, lastCol: 6 });
    expect(bars[0]).toMatchObject({ startCol: 4, endCol: 6, continuesLeft: true });
  });
});

describe('weekRowColumns', () => {
  it('toutes les colonnes en vue semaine (pas de mois)', () => {
    expect(weekRowColumns('2026-10-12')).toEqual({ firstCol: 0, lastCol: 6 });
  });

  it('toutes les colonnes pour une semaine entièrement dans le mois', () => {
    expect(weekRowColumns('2026-10-12', '2026-10-15')).toEqual({ firstCol: 0, lastCol: 6 });
  });

  it('borne la première rangée d’un mois qui ne commence pas un lundi', () => {
    // Lundi 28/09 : seuls jeudi 1er → dimanche 4 octobre sont dans le mois.
    expect(weekRowColumns('2026-09-28', '2026-10-15')).toEqual({ firstCol: 3, lastCol: 6 });
  });

  it('borne la dernière rangée d’un mois qui ne finit pas un dimanche', () => {
    // Lundi 26/10 : lundi → samedi 31 octobre sont dans le mois.
    expect(weekRowColumns('2026-10-26', '2026-10-15')).toEqual({ firstCol: 0, lastCol: 5 });
  });
});

describe('longBarsForRow', () => {
  it('borne aux cases du mois en vue mois, et pas en vue semaine', () => {
    const slots = buildSlots([ev('expo', '2026-09-01', { date_end: '2026-10-31' })], {});
    // Rangée du lundi 28/09, mois d'octobre affiché : seules les colonnes 3 à 6 existent.
    const month = longBarsForRow(slots, '2026-09-28', '2026-10-02', true);
    expect(month.bars[0]).toMatchObject({ startCol: 3, endCol: 6, continuesLeft: true });
    const week = longBarsForRow(slots, '2026-09-28', '2026-10-02', false);
    expect(week.bars[0]).toMatchObject({ startCol: 0, endCol: 6, continuesLeft: true });
  });
});

describe('eventCategoryInk', () => {
  it('texte foncé sur l’ambre des spectacles, blanc sur les autres catégories', () => {
    expect(eventCategoryInk('Spectacle')).toBe('#412402');
    expect(eventCategoryInk(null)).toBe('#412402');
    for (const c of ['Atelier', 'Festival', 'Fête', 'Marché', 'Exposition']) {
      expect(eventCategoryInk(c)).toBe('#fff');
    }
  });
});
