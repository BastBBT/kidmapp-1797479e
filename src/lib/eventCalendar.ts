// Helpers de la vue calendrier des Sorties.
// Miroir de `EventsViewModel` (iOS) et `EventsState` (Flutter).
//
// Tout raisonne sur des dates ISO `YYYY-MM-DD` plutôt que sur des `Date` :
// c'est le format déjà stocké en base et comparé ailleurs dans `weekend.ts`,
// et ça évite les décalages de fuseau/heure d'été sur les clés de regroupement.

import { EventItem, EventOccurrence } from '@/types/event';
import {
  eventInWeek,
  eventSortRank,
  isShortEvent,
  isPastEvent,
  todayISO,
  toISODate,
  type Week,
} from '@/lib/weekend';

/**
 * Un créneau à poser dans la grille : l'event et la date précise concernée.
 * C'est l'unité du calendrier, pas l'event : un event à trois dates pose trois
 * pastilles, chacune sur son jour.
 */
export interface EventSlot {
  event: EventItem;
  occurrence: EventOccurrence;
}

/**
 * Créneaux d'un event. À défaut de créneaux chargés (requête en échec, ou event
 * sans ligne dans `event_occurrences`), on en reconstruit un depuis
 * `date_start/date_end/time` : le calendrier ne doit pas se vider parce que la
 * table est muette.
 */
export const occurrencesOf = (
  event: EventItem,
  byEvent: Record<string, EventOccurrence[]>,
): EventOccurrence[] => {
  const loaded = byEvent[event.id];
  if (loaded?.length) return loaded;
  if (!event.date_start) return [];
  return [
    {
      id: `fallback-${event.id}`,
      event_id: event.id,
      date_start: event.date_start,
      date_end: event.date_end,
      time: event.time,
    },
  ];
};

/** Tous les créneaux des events filtrés — base commune des vues calendrier. */
export const buildSlots = (
  events: EventItem[],
  byEvent: Record<string, EventOccurrence[]>,
): EventSlot[] =>
  events.flatMap((event) => occurrencesOf(event, byEvent).map((occurrence) => ({ event, occurrence })));

/** `YYYY-MM-DD` → `Date` locale à minuit. */
export const dateFromISO = (iso: string): Date => new Date(`${iso}T00:00:00`);

/** Décale une date ISO de `days` jours, sans passer par l'arithmétique de `Date` sur les heures. */
export const addDaysISO = (iso: string, days: number): string => {
  const d = dateFromISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/** Lundi de la semaine contenant `iso`. */
export const mondayISO = (iso: string): string => {
  const d = dateFromISO(iso);
  const dow = d.getDay(); // 0 dimanche … 6 samedi
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow);
};

/** Premier jour du mois de `iso`. */
export const monthStartISO = (iso: string): string => `${iso.slice(0, 7)}-01`;

/** Dernier jour du mois de `iso`. */
export const monthEndISO = (iso: string): string => {
  const d = dateFromISO(monthStartISO(iso));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISODate(d);
};

const nextMonthStartISO = (iso: string): string => addDaysISO(monthEndISO(iso), 1);

/**
 * Événements « courts » (journée / week-end) indexés par jour traversé.
 * Ce sont les seuls à peupler la grille : une expo de deux mois y poserait une
 * pastille sur soixante cases et noierait tout le reste — elle passe par le
 * bandeau « En ce moment » à la place.
 */
export const shortSlotsByDay = (slots: EventSlot[]): Record<string, EventSlot[]> => {
  const map: Record<string, EventSlot[]> = {};
  for (const slot of slots) {
    const { date_start, date_end } = slot.occurrence;
    if (!date_start || !isShortEvent(date_start, date_end)) continue;
    const last = date_end ?? date_start;
    let day = date_start;
    // Garde-fou : `isShortEvent` borne déjà à 3 jours, la boucle ne peut pas filer.
    while (day <= last) {
      (map[day] ??= []).push(slot);
      day = addDaysISO(day, 1);
    }
  }
  return map;
};

/**
 * Créneaux courts d'un jour, dans l'ordre d'affichage habituel. Le rang porte
 * sur le créneau et non sur l'event : un event dont la première date est passée
 * garde ses dates suivantes en tête de liste.
 */
export const shortSlotsOn = (byDay: Record<string, EventSlot[]>, dayISO: string): EventSlot[] =>
  [...(byDay[dayISO] ?? [])].sort((a, b) => {
    const ra = slotDayRank(a);
    const rb = slotDayRank(b);
    if (ra !== rb) return ra - rb;
    return (a.occurrence.time ?? '').localeCompare(b.occurrence.time ?? '');
  });

const slotDayRank = (slot: EventSlot): number =>
  isPastEvent(slot.occurrence.date_start, slot.occurrence.date_end) ? 1 : 0;

/**
 * Expos, festivals et autres événements au long cours qui couvrent ce jour.
 * Dédoublonnés : deux créneaux longs d'un même event ne donnent qu'une pastille.
 */
export const longEventsOn = (slots: EventSlot[], dayISO: string): EventItem[] => {
  const seen = new Set<string>();
  const result: EventItem[] = [];
  for (const { event, occurrence } of slots) {
    const { date_start, date_end } = occurrence;
    if (!date_start || isShortEvent(date_start, date_end)) continue;
    const end = date_end ?? date_start;
    if (date_start > dayISO || end < dayISO) continue;
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    result.push(event);
  }
  return result;
};

/** Barre d'un événement long dans une rangée de semaine du calendrier. */
export interface LongBar {
  slot: EventSlot;
  /** Colonnes (0 = lundi) couvertes dans la rangée, bornes incluses. */
  startCol: number;
  endCol: number;
  continuesLeft: boolean;
  continuesRight: boolean;
  lane: number;
}

export interface WeekLongBars {
  bars: LongBar[];
  /** Events longs qui n'ont pas trouvé de ligne : rendus en « +N » et dans la bande « En ce moment ». */
  hidden: EventItem[];
  laneCount: number;
}

const dayDiff = (fromISO: string, toISO: string): number =>
  Math.round(
    (Date.UTC(+toISO.slice(0, 4), +toISO.slice(5, 7) - 1, +toISO.slice(8, 10)) -
      Date.UTC(+fromISO.slice(0, 4), +fromISO.slice(5, 7) - 1, +fromISO.slice(8, 10))) /
      86_400_000,
  );

/**
 * Colonnes (0 = lundi) d'une rangée de semaine qui portent des cases. En vue
 * mois, les cases hors du mois affiché sont vides : la grille et la bande « En
 * ce moment » doivent borner les barres de la même façon, sinon elles ne
 * s'accordent pas sur ce qui est dessiné.
 */
export const weekRowColumns = (
  mondayOfWeekISO: string,
  monthISO?: string,
): { firstCol: number; lastCol: number } => {
  if (!monthISO) return { firstCol: 0, lastCol: 6 };
  const prefix = monthISO.slice(0, 7);
  const cols = [0, 1, 2, 3, 4, 5, 6].filter((i) => addDaysISO(mondayOfWeekISO, i).startsWith(prefix));
  return { firstCol: cols[0] ?? 0, lastCol: cols[cols.length - 1] ?? 6 };
};

/**
 * Barres d'événements longs d'une rangée de semaine, une par event, rangées sur
 * `maxLanes` lignes. `firstCol`/`lastCol` bornent les colonnes visibles : en
 * vue mois, les cases hors du mois ne portent rien. Miroir de
 * `EventsViewModel.longBars` (iOS) et `EventsState.longBarsFor` (Flutter).
 */
export const longBarsForWeek = (
  slots: EventSlot[],
  mondayOfWeekISO: string,
  { firstCol = 0, lastCol = 6, maxLanes = 2 }: { firstCol?: number; lastCol?: number; maxLanes?: number } = {},
): WeekLongBars => {
  const byEvent = new Map<string, { slot: EventSlot; s: number; e: number }>();
  for (const slot of slots) {
    const { date_start, date_end } = slot.occurrence;
    if (!date_start || isShortEvent(date_start, date_end)) continue;
    const cs = dayDiff(mondayOfWeekISO, date_start);
    const ce = dayDiff(mondayOfWeekISO, date_end ?? date_start);
    if (ce < firstCol || cs > lastCol) continue;
    const known = byEvent.get(slot.event.id);
    byEvent.set(
      slot.event.id,
      known
        ? { slot: known.s <= cs ? known.slot : slot, s: Math.min(known.s, cs), e: Math.max(known.e, ce) }
        : { slot, s: cs, e: ce },
    );
  }

  const ordered = [...byEvent.values()].sort((a, b) => {
    const sa = Math.max(a.s, firstCol);
    const sb = Math.max(b.s, firstCol);
    if (sa !== sb) return sa - sb;
    const la = a.e - a.s;
    const lb = b.e - b.s;
    if (la !== lb) return lb - la;
    return a.slot.event.name.localeCompare(b.slot.event.name);
  });

  const laneEnds: number[] = [];
  const bars: LongBar[] = [];
  const hidden: EventItem[] = [];
  for (const item of ordered) {
    const s = Math.max(item.s, firstCol);
    const e = Math.min(item.e, lastCol);
    let lane = laneEnds.findIndex((end) => end < s);
    if (lane >= 0) {
      laneEnds[lane] = e;
    } else if (laneEnds.length < maxLanes) {
      laneEnds.push(e);
      lane = laneEnds.length - 1;
    } else {
      hidden.push(item.slot.event);
      continue;
    }
    bars.push({ slot: item.slot, startCol: s, endCol: e, continuesLeft: item.s < s, continuesRight: item.e > e, lane });
  }
  return { bars, hidden, laneCount: laneEnds.length };
};

/**
 * Barres d'une rangée de la vue calendrier. Point d'entrée unique de la grille
 * et de la bande « En ce moment » : les deux doivent décider pareil de ce qui
 * est dessiné, d'où une seule façon de borner les colonnes (cases du mois
 * affiché en vue mois, semaine entière sinon).
 */
export const longBarsForRow = (
  slots: EventSlot[],
  mondayOfRowISO: string,
  selectedDay: string,
  monthExpanded: boolean,
): WeekLongBars =>
  longBarsForWeek(slots, mondayOfRowISO, weekRowColumns(mondayOfRowISO, monthExpanded ? selectedDay : undefined));

/**
 * Mois portant au moins un créneau, sous forme de premier jour de mois.
 * Un mois compte dès qu'un créneau le **traverse**, pas seulement s'il y
 * démarre. Le mois courant est toujours présent : sans lui le calendrier
 * disparaîtrait hors saison.
 */
export const populatedMonths = (slots: EventSlot[]): string[] => {
  const months = new Set<string>([monthStartISO(todayISO())]);
  for (const { occurrence } of slots) {
    if (!occurrence.date_start) continue;
    const last = monthStartISO(occurrence.date_end ?? occurrence.date_start);
    let m = monthStartISO(occurrence.date_start);
    while (m <= last) {
      months.add(m);
      m = nextMonthStartISO(m);
    }
  }
  return [...months].sort();
};

/** Semaines portant au moins un créneau (+ la semaine courante), en lundis ISO. */
export const populatedWeeks = (slots: EventSlot[]): string[] => {
  const weeks = new Set<string>([mondayISO(todayISO())]);
  for (const { occurrence } of slots) {
    if (!occurrence.date_start) continue;
    const last = mondayISO(occurrence.date_end ?? occurrence.date_start);
    let w = mondayISO(occurrence.date_start);
    while (w <= last) {
      weeks.add(w);
      w = addDaysISO(w, 7);
    }
  }
  return [...weeks].sort();
};

/**
 * Période peuplée suivante / précédente : on saute les périodes vides plutôt
 * que d'avancer d'un cran, sinon les flèches font traverser des mois morts.
 */
export const adjacentPopulated = (
  periods: string[],
  currentStart: string,
  forward: boolean,
): string | null => {
  if (forward) return periods.find((p) => p > currentStart) ?? null;
  return [...periods].reverse().find((p) => p < currentStart) ?? null;
};

/** Premier jour porteur de créneaux dans l'intervalle, sinon `null`. */
export const firstEventDay = (
  byDay: Record<string, EventSlot[]>,
  startISO: string,
  endISO: string,
): string | null =>
  Object.keys(byDay)
    .filter((d) => d >= startISO && d <= endISO)
    .sort()[0] ?? null;

/**
 * Jour à sélectionner à l'ouverture : le premier jour à venir qui porte un
 * créneau, à défaut aujourd'hui.
 */
export const defaultSelectedDay = (byDay: Record<string, EventSlot[]>): string => {
  const today = todayISO();
  return (
    Object.keys(byDay)
      .filter((d) => d >= today)
      .sort()[0] ?? today
  );
};

/** Cases d'une grille mensuelle : `null` pour les cellules avant le 1er du mois. */
export const monthGridCells = (monthISO: string): (string | null)[] => {
  const first = monthStartISO(monthISO);
  const firstDow = dateFromISO(first).getDay(); // 0 dimanche
  const leading = (firstDow + 6) % 7; // grille lundi → dimanche
  const dayCount = Number(monthEndISO(first).slice(8, 10));
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, i) => addDaysISO(first, i)),
  ];
};

/**
 * Créneaux d'une semaine (lun→dim), dans l'ordre d'affichage de la liste.
 * L'unité est le créneau et non l'event : un spectacle joué trois samedis
 * apparaît dans les trois semaines, chaque fois à sa date.
 */
export const weekSlots = (slots: EventSlot[], week: Week): EventSlot[] => {
  const monISO = toISODate(week.monday);
  return slots
    .filter(({ occurrence }) => eventInWeek(occurrence.date_start, occurrence.date_end, week))
    .sort((a, b) => {
      // Tri à 3 paliers : les créneaux courts (journée / week-end) d'abord, puis
      // les longs (expos, festivals sur plusieurs semaines) qui sinon squattent
      // le haut de liste avec leur début lointain, et enfin ceux déjà terminés.
      const ra = eventSortRank(a.occurrence.date_start, a.occurrence.date_end);
      const rb = eventSortRank(b.occurrence.date_start, b.occurrence.date_end);
      if (ra !== rb) return ra - rb;
      // À rang égal : date de début « ramenée » au lundi de la semaine.
      const ka = a.occurrence.date_start < monISO ? monISO : a.occurrence.date_start;
      const kb = b.occurrence.date_start < monISO ? monISO : b.occurrence.date_start;
      return ka.localeCompare(kb);
    });
};

/** Les events d'une liste de créneaux, dédoublonnés (marqueurs de la mini-carte). */
export const distinctEvents = (slots: EventSlot[]): EventItem[] => {
  const seen = new Set<string>();
  return slots.filter(({ event }) => !seen.has(event.id) && seen.add(event.id)).map(({ event }) => event);
};

/**
 * Filtre PostgREST `or=(…)` de la fenêtre de chargement des events.
 *
 * Deux premiers termes : les dates portées par l'event — le filet des events
 * sans ligne dans `event_occurrences`. Troisième terme : les events ayant un
 * créneau dans la fenêtre, qui rattrape ceux dont la date synchronisée est
 * périmée (le trigger de synchro n'est rejoué qu'à l'écriture d'un créneau,
 * jamais au fil du temps). Sans ids — requête créneaux en échec — on retombe
 * exactement sur l'ancien filtre.
 */
export const eventsWindowFilter = (
  since: string,
  today: string,
  idsWithOccurrence: string[] = [],
): string =>
  [
    `date_start.gte.${since}`,
    `date_end.gte.${today}`,
    ...(idsWithOccurrence.length ? [`id.in.(${idsWithOccurrence.join(',')})`] : []),
  ].join(',');
