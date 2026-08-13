// Helpers de la vue calendrier des Sorties.
// Miroir de `EventsViewModel` (iOS) et `EventsState` (Flutter).
//
// Tout raisonne sur des dates ISO `YYYY-MM-DD` plutôt que sur des `Date` :
// c'est le format déjà stocké en base et comparé ailleurs dans `weekend.ts`,
// et ça évite les décalages de fuseau/heure d'été sur les clés de regroupement.

import { EventItem } from '@/types/event';
import { isShortEvent, isPastEvent, todayISO, toISODate } from '@/lib/weekend';

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
export const shortEventsByDay = (events: EventItem[]): Record<string, EventItem[]> => {
  const map: Record<string, EventItem[]> = {};
  for (const ev of events) {
    if (!ev.date_start || !isShortEvent(ev.date_start, ev.date_end)) continue;
    const last = ev.date_end ?? ev.date_start;
    let day = ev.date_start;
    // Garde-fou : `isShortEvent` borne déjà à 3 jours, la boucle ne peut pas filer.
    while (day <= last) {
      (map[day] ??= []).push(ev);
      day = addDaysISO(day, 1);
    }
  }
  return map;
};

/** Événements courts d'un jour, dans l'ordre d'affichage habituel. */
export const shortEventsOn = (byDay: Record<string, EventItem[]>, dayISO: string): EventItem[] =>
  [...(byDay[dayISO] ?? [])].sort((a, b) => {
    const ra = eventDayRank(a);
    const rb = eventDayRank(b);
    if (ra !== rb) return ra - rb;
    return (a.time ?? '').localeCompare(b.time ?? '');
  });

const eventDayRank = (ev: EventItem): number => (isPastEvent(ev.date_start, ev.date_end) ? 1 : 0);

/** Expos, festivals et autres événements au long cours qui couvrent ce jour. */
export const longEventsOn = (events: EventItem[], dayISO: string): EventItem[] =>
  events.filter((ev) => {
    if (!ev.date_start || isShortEvent(ev.date_start, ev.date_end)) return false;
    const end = ev.date_end ?? ev.date_start;
    return ev.date_start <= dayISO && end >= dayISO;
  });

/**
 * Mois portant au moins un événement, sous forme de premier jour de mois.
 * Un mois compte dès qu'un événement le **traverse**, pas seulement s'il y
 * démarre. Le mois courant est toujours présent : sans lui le calendrier
 * disparaîtrait hors saison.
 */
export const populatedMonths = (events: EventItem[]): string[] => {
  const months = new Set<string>([monthStartISO(todayISO())]);
  for (const ev of events) {
    if (!ev.date_start) continue;
    const last = monthStartISO(ev.date_end ?? ev.date_start);
    let m = monthStartISO(ev.date_start);
    while (m <= last) {
      months.add(m);
      m = nextMonthStartISO(m);
    }
  }
  return [...months].sort();
};

/** Semaines portant au moins un événement (+ la semaine courante), en lundis ISO. */
export const populatedWeeks = (events: EventItem[]): string[] => {
  const weeks = new Set<string>([mondayISO(todayISO())]);
  for (const ev of events) {
    if (!ev.date_start) continue;
    const last = mondayISO(ev.date_end ?? ev.date_start);
    let w = mondayISO(ev.date_start);
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

/** Premier jour porteur d'événements dans l'intervalle, sinon `null`. */
export const firstEventDay = (
  byDay: Record<string, EventItem[]>,
  startISO: string,
  endISO: string,
): string | null =>
  Object.keys(byDay)
    .filter((d) => d >= startISO && d <= endISO)
    .sort()[0] ?? null;

/**
 * Jour à sélectionner à l'ouverture : le premier jour à venir qui porte un
 * événement, à défaut aujourd'hui.
 */
export const defaultSelectedDay = (byDay: Record<string, EventItem[]>): string => {
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
