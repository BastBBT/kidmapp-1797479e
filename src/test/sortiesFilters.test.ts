import { describe, it, expect } from 'vitest';
import type { EventItem, EventOccurrence } from '@/types/event';
import {
  buildDayGroups,
  countSorties,
  filterSlots,
  longEventsInRange,
  slotStartLabel,
  whenDays,
  type EventCriteria,
} from '@/lib/sortiesFilters';

// Mêmes cas que `test/events_calendar_test.dart` (Android) : la liste par jour
// et les compteurs doivent dire la même chose sur les trois plateformes.

const TODAY = '2026-10-22'; // un jeudi

const ev = (id: string, patch: Partial<EventItem> = {}): EventItem => ({
  id, name: id, category: 'Atelier', address: null, lat: null, lng: null,
  date_start: TODAY, date_end: null, time: null, age_min_months: null, age_max_months: null,
  duration: null, weather: null, price: null, is_free: null, website: null, booking_url: null,
  instagram: null, photo: null, note: null, status: 'published', user_id: null,
  created_at: '2026-10-01', updated_at: '2026-10-01', favorites_count: null,
  ...patch,
});

const occ = (eventId: string, time: string, date = TODAY): EventOccurrence => ({
  id: `${eventId}-${time}`, event_id: eventId, date_start: date, date_end: null, time,
});

const criteria = (patch: Partial<EventCriteria> = {}): EventCriteria => ({
  days: [TODAY], ageBuckets: new Set(), categories: new Set(), moments: new Set(),
  onlyFree: false, onlyNearby: false, ...patch,
});

const near = () => true;

describe('whenDays', () => {
  it('le week-end est celui qui vient, et rétrécit le week-end même', () => {
    expect(whenDays({ kind: 'weekend' }, '2026-10-22')).toEqual(['2026-10-24', '2026-10-25']);
    expect(whenDays({ kind: 'weekend' }, '2026-10-24')).toEqual(['2026-10-24', '2026-10-25']);
    expect(whenDays({ kind: 'weekend' }, '2026-10-25')).toEqual(['2026-10-25']);
  });

  it('« Semaine » couvre les sept prochains jours, même un dimanche', () => {
    const days = whenDays({ kind: 'week' }, '2026-10-25');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-10-25');
    expect(days[6]).toBe('2026-10-31');
  });
});

describe('liste par jour', () => {
  it('deux séances le même jour donnent une carte, pas deux', () => {
    const events = [ev('poney')];
    const byEvent = { poney: [occ('poney', '17h15'), occ('poney', '16h30')] };
    const slots = filterSlots(events, byEvent, criteria(), near);
    const cards = buildDayGroups(slots, [TODAY], 'heure')[0].sections.flatMap((s) => s.cards);
    expect(cards).toHaveLength(1);
    expect(slotStartLabel(cards[0].slot)).toBe('16h30');
    expect(cards[0].otherTimes).toEqual(['17h15']);
    expect(countSorties(events, byEvent, criteria(), near)).toBe(1);
  });

  it('une plage horaire se range à son heure de début, minutes comprises', () => {
    const events = [ev('neuf_trente', { time: '9h30-10h30' }), ev('neuf', { time: '9h' }), ev('zero_neuf', { time: '09h45' })];
    const slots = filterSlots(events, {}, criteria(), near);
    const cards = buildDayGroups(slots, [TODAY], 'heure')[0].sections[0].cards;
    expect(cards.map((c) => c.slot.event.id)).toEqual(['neuf', 'neuf_trente', 'zero_neuf']);
    expect(cards.map((c) => slotStartLabel(c.slot))).toEqual(['9h', '9h30', '9h45']);
  });

  it('les cartes se rangent par moment, les horaires illisibles à la fin', () => {
    const events = [
      ev('soir', { time: '19h' }),
      ev('flou', { time: 'en journée' }),
      ev('matin', { time: '10h30' }),
      ev('aprem', { time: '14h-16h' }),
    ];
    const sections = buildDayGroups(filterSlots(events, {}, criteria(), near), [TODAY], 'heure')[0].sections;
    expect(sections.map((s) => s.moment)).toEqual(['matin', 'apresMidi', 'soir', null]);
    expect(sections.map((s) => s.cards[0].slot.event.id)).toEqual(['matin', 'aprem', 'soir', 'flou']);
  });

  it('le filtre de moment garde les créneaux sans horaire lisible', () => {
    const events = [ev('matin', { time: '10h' }), ev('aprem', { time: '15h' }), ev('flou')];
    const c = criteria({ moments: new Set(['apresMidi']) });
    const ids = buildDayGroups(filterSlots(events, {}, c, near), [TODAY], 'heure')
      .flatMap((g) => g.sections.flatMap((s) => s.cards.map((card) => card.slot.event.id)));
    expect(ids).toEqual(['aprem', 'flou']);
    expect(countSorties(events, {}, c, near)).toBe(2);
  });

  it("plusieurs genres cochés s'additionnent", () => {
    const events = [ev('spectacle', { category: 'Spectacle' }), ev('atelier'), ev('expo', { category: 'Exposition' })];
    expect(countSorties(events, {}, criteria({ categories: new Set(['Spectacle']) }), near)).toBe(1);
    expect(countSorties(events, {}, criteria({ categories: new Set(['Spectacle', 'Atelier']) }), near)).toBe(2);
    expect(countSorties(events, {}, criteria(), near)).toBe(3);
  });

  it('une sortie longue compte une fois sur la période, hors des cartes du jour', () => {
    const events = [ev('expo', { category: 'Exposition', date_start: '2026-10-19', date_end: '2026-11-11' })];
    const c = criteria({ days: whenDays({ kind: 'week' }, TODAY) });
    const slots = filterSlots(events, {}, c, near);
    expect(buildDayGroups(slots, c.days, 'heure')).toEqual([]);
    expect(longEventsInRange(slots, c.days).map((e) => e.id)).toEqual(['expo']);
    expect(countSorties(events, {}, c, near)).toBe(1);
  });
});
