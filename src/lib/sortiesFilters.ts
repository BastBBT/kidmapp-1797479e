// Filtres, compteurs et liste par jour de l'onglet Sorties.
// Miroir de `EventsViewModel` (iOS, Event.swift) et `EventsState` (Flutter) :
// même découpage en périodes et en moments, mêmes règles de comptage.

import { EventItem, EventOccurrence } from '@/types/event';
import { ChildAgeBucket, matchesAgeBuckets } from '@/lib/ageFilter';
import { isShortEvent, todayISO } from '@/lib/weekend';
import { addDaysISO, dateFromISO, occurrencesOf, shortSlotsByDay, type EventSlot } from '@/lib/eventCalendar';

/** Moment de la journée d'un créneau, déduit de son heure de début. */
export type DayMoment = 'matin' | 'apresMidi' | 'soir';
export const DAY_MOMENTS: DayMoment[] = ['matin', 'apresMidi', 'soir'];

/** Période affichée : un raccourci, ou un jour choisi dans le calendrier. */
export type SortiesWhen =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'weekend' }
  | { kind: 'week' }
  | { kind: 'day'; date: string };

export const WHEN_SHORTCUTS: SortiesWhen[] = [
  { kind: 'today' },
  { kind: 'tomorrow' },
  { kind: 'weekend' },
  { kind: 'week' },
];

export const sameWhen = (a: SortiesWhen, b: SortiesWhen): boolean =>
  a.kind === b.kind && (a.kind !== 'day' || (b.kind === 'day' && a.date === b.date));

/**
 * Jours couverts (ISO), à partir d'aujourd'hui. Le week-end est celui qui vient
 * (le dimanche, il ne reste que dimanche) ; « Semaine » couvre les sept
 * prochains jours, pour ne pas se réduire à un seul jour le dimanche.
 */
export const whenDays = (when: SortiesWhen, today: string = todayISO()): string[] => {
  switch (when.kind) {
    case 'today': return [today];
    case 'tomorrow': return [addDaysISO(today, 1)];
    case 'week': return Array.from({ length: 7 }, (_, i) => addDaysISO(today, i));
    case 'day': return [when.date];
    case 'weekend': {
      const wd = dateFromISO(today).getDay(); // 0 = dimanche, 6 = samedi
      if (wd === 0) return [today];
      if (wd === 6) return [today, addDaysISO(today, 1)];
      return [addDaysISO(today, 6 - wd), addDaysISO(today, 7 - wd)];
    }
  }
};

/** Ordre de la liste — même trio qu'Explorer, l'heure à la place du « par défaut ». */
export type EventSortMode = 'heure' | 'aimes' | 'recents';

/** Filtres sous forme de valeur : on peut en simuler une variante sans toucher à l'écran. */
export interface EventCriteria {
  days: string[];
  ageBuckets: Set<ChildAgeBucket>;
  categories: Set<string>;
  moments: Set<DayMoment>;
  onlyFree: boolean;
  onlyNearby: boolean;
}

/** « 15h00 » / « 15h » / « 15:00 » → minutes depuis minuit. */
const parseTime = (s: string): number | null => {
  const parts = s.toLowerCase().replace(/h/g, ':').split(':');
  const h = parseInt(parts[0], 10);
  if (isNaN(h) || h < 0 || h > 23) return null;
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  return h * 60 + (isNaN(m) ? 0 : m);
};

/**
 * Heure de début d'un créneau en minutes, `null` si illisible. « 9h30-10h30 » :
 * seul le début compte — sans cette coupe, 9h30 serait rangé à 9h00.
 */
export const slotMinutes = ({ event, occurrence }: EventSlot): number | null => {
  const t = occurrence.time ?? event.time;
  if (!t) return null;
  return parseTime(t.split('-')[0].trim());
};

export const slotMoment = (slot: EventSlot): DayMoment | null => {
  const m = slotMinutes(slot);
  if (m === null) return null;
  if (m < 12 * 60) return 'matin';
  if (m < 18 * 60) return 'apresMidi';
  return 'soir';
};

/** « 9h30 », « 14h » : l'heure de début dans une écriture unique, quelle que soit la saisie. */
export const slotStartLabel = (slot: EventSlot): string | null => {
  const m = slotMinutes(slot);
  if (m === null) return null;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, '0')}`;
};

/** Filtres portés par l'event lui-même (tout sauf la période et le moment). */
export const eventPasses = (
  event: EventItem,
  c: EventCriteria,
  isNear: (event: EventItem) => boolean,
): boolean => {
  if (c.categories.size > 0 && !c.categories.has(event.category || 'Autre')) return false;
  if (c.onlyFree && event.is_free !== true) return false;
  if (c.onlyNearby && !isNear(event)) return false;
  return matchesAgeBuckets(event, c.ageBuckets);
};

/** Un créneau sans horaire lisible reste affiché : on ne sait pas, on ne l'écarte pas. */
export const momentPasses = (slot: EventSlot, moments: Set<DayMoment>): boolean => {
  if (moments.size === 0) return true;
  const m = slotMoment(slot);
  return m === null || moments.has(m);
};

/** Créneaux passant tous les filtres sauf la période — base de la liste et du calendrier. */
export const filterSlots = (
  events: EventItem[],
  byEvent: Record<string, EventOccurrence[]>,
  c: EventCriteria,
  isNear: (event: EventItem) => boolean,
): EventSlot[] =>
  events
    .filter((event) => eventPasses(event, c, isNear))
    .flatMap((event) => occurrencesOf(event, byEvent).map((occurrence) => ({ event, occurrence })))
    .filter((slot) => momentPasses(slot, c.moments));

/**
 * Nombre de sorties : une sortie compte une fois par jour où elle a lieu (deux
 * séances le même jour = une carte), et une fois en tout quand elle dure plus
 * de trois jours (expo, stage).
 */
export const countSorties = (
  events: EventItem[],
  byEvent: Record<string, EventOccurrence[]>,
  c: EventCriteria,
  isNear: (event: EventItem) => boolean,
): number => {
  if (c.days.length === 0) return 0;
  const days = [...c.days].sort();
  const first = days[0];
  const last = days[days.length - 1];
  const seen = new Set<string>();
  for (const slot of filterSlots(events, byEvent, c, isNear)) {
    const { date_start: start, date_end } = slot.occurrence;
    if (!start) continue;
    const end = date_end ?? start;
    if (start > last || end < first) continue;
    if (!isShortEvent(start, date_end)) {
      seen.add(slot.event.id);
      continue;
    }
    for (const d of days) if (d >= start && d <= end) seen.add(`${slot.event.id}|${d}`);
  }
  return seen.size;
};

/** Une sortie un jour donné, avec ses autres séances du même jour (« Aussi à 17h15 »). */
export interface DayCard {
  slot: EventSlot;
  otherTimes: string[];
  day: string;
}

export interface MomentSection {
  /** `null` = horaire illisible, ou tri autre que par heure (une seule section). */
  moment: DayMoment | null;
  cards: DayCard[];
}

export interface DayGroup {
  day: string;
  sections: MomentSection[];
}

/**
 * Jours de la période, chacun découpé en matin / après-midi / soir — ou en une
 * seule section quand on trie par favoris ou nouveauté.
 */
export const buildDayGroups = (slots: EventSlot[], days: string[], sort: EventSortMode): DayGroup[] => {
  const byDay = shortSlotsByDay(slots);
  const groups: DayGroup[] = [];
  for (const day of days) {
    const daySlots = [...(byDay[day] ?? [])].sort(
      (a, b) => (slotMinutes(a) ?? Number.MAX_SAFE_INTEGER) - (slotMinutes(b) ?? Number.MAX_SAFE_INTEGER),
    );
    const grouped = new Map<string, EventSlot[]>();
    for (const slot of daySlots) {
      const list = grouped.get(slot.event.id);
      if (list) list.push(slot);
      else grouped.set(slot.event.id, [slot]);
    }
    const cards: DayCard[] = [...grouped.values()].map((list) => ({
      slot: list[0],
      otherTimes: list.slice(1).map(slotStartLabel).filter((s): s is string => s !== null),
      day,
    }));
    if (cards.length === 0) continue;
    let sections: MomentSection[];
    if (sort === 'heure') {
      sections = [...DAY_MOMENTS, null]
        .map((moment) => ({ moment, cards: cards.filter((c) => slotMoment(c.slot) === moment) }))
        .filter((s) => s.cards.length > 0);
    } else if (sort === 'aimes') {
      sections = [{
        moment: null,
        cards: [...cards].sort((a, b) => (b.slot.event.favorites_count ?? 0) - (a.slot.event.favorites_count ?? 0)),
      }];
    } else {
      sections = [{
        moment: null,
        cards: [...cards].sort((a, b) => (b.slot.event.created_at ?? '').localeCompare(a.slot.event.created_at ?? '')),
      }];
    }
    groups.push({ day, sections });
  }
  return groups;
};

/** Sorties de plus de trois jours qui traversent la période : une pastille chacune. */
export const longEventsInRange = (slots: EventSlot[], days: string[]): EventItem[] => {
  if (days.length === 0) return [];
  const sorted = [...days].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const seen = new Set<string>();
  const result: EventItem[] = [];
  for (const { event, occurrence } of slots) {
    const { date_start: start, date_end } = occurrence;
    if (!start || isShortEvent(start, date_end)) continue;
    if (start > last || (date_end ?? start) < first) continue;
    if (!seen.has(event.id)) {
      seen.add(event.id);
      result.push(event);
    }
  }
  return result;
};
