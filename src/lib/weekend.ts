// Utilities for weekend selection (Sat/Sun pairs).

export interface Weekend {
  key: string;          // ISO date of the Saturday
  saturday: Date;
  sunday: Date;
  label: string;        // e.g. "Ce week-end", "Sam 20 juil.", or "20–21 juil."
  shortLabel: string;   // e.g. "Sam 20", "20–21 juil."
  past?: boolean;       // true if the weekend is entirely in the past
}

const toISODate = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const startOfDay = (d: Date) => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};

const monthShort = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

/** Returns the upcoming Saturday for a given date (same day if it's already Sat). */
export const upcomingSaturday = (from: Date = new Date()): Date => {
  const d = startOfDay(from);
  const dow = d.getDay(); // 0 Sun, 6 Sat
  let add = 0;
  if (dow === 6) add = 0;
  else if (dow === 0) add = 6; // if Sunday, the "current" weekend Saturday was yesterday — go to next
  else add = 6 - dow;
  d.setDate(d.getDate() + add);
  return d;
};

/**
 * Build a list of `count` upcoming weekends starting from today's weekend.
 * If today is Sunday, that weekend is still included (Sat was yesterday) so
 * users can still filter "this weekend".
 */
export const buildWeekends = (
  count = 8,
  from: Date = new Date(),
  includeLast = false,
): Weekend[] => {
  const now = startOfDay(from);
  const dow = now.getDay();
  // Start Saturday: for Sun (0), start on yesterday's Sat.
  const first = new Date(now);
  if (dow === 0) first.setDate(first.getDate() - 1);
  else if (dow < 6) first.setDate(first.getDate() + (6 - dow));

  const result: Weekend[] = [];
  const currentWeekendKey = toISODate(first);
  const startI = includeLast ? -1 : 0;

  for (let i = startI; i < count; i++) {
    const sat = new Date(first);
    sat.setDate(first.getDate() + i * 7);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const key = toISODate(sat);
    const sameMonth = sat.getMonth() === sun.getMonth();
    const shortLabel = sameMonth
      ? `${sat.getDate()}–${sun.getDate()} ${monthShort(sun)}`
      : `${sat.getDate()} ${monthShort(sat)}–${sun.getDate()} ${monthShort(sun)}`;
    const past = i < 0;
    const label = past
      ? 'Week-end dernier'
      : key === currentWeekendKey
        ? 'Ce week-end'
        : shortLabel;
    result.push({ key, saturday: sat, sunday: sun, label, shortLabel, past });
  }
  return result;
};

/** ISO date of the Monday of the previous week (relative to `from`). */
export const lastMondayISO = (from: Date = new Date()): string => {
  const d = startOfDay(from);
  const dow = d.getDay(); // 0 Sun..6 Sat
  const diffToThisMonday = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffToThisMonday - 7);
  return toISODate(d);
};

export const currentWeekendKey = (from: Date = new Date()): string => {
  const now = startOfDay(from);
  const dow = now.getDay();
  const sat = new Date(now);
  if (dow === 0) sat.setDate(sat.getDate() - 1);
  else if (dow < 6) sat.setDate(sat.getDate() + (6 - dow));
  return toISODate(sat);
};

/** Does this event fall on the given weekend? Considers date_start..date_end overlap.
 *  Additionally, a weekday-only event (Mon–Fri, no Sat/Sun in its range) is
 *  attached to the Saturday that follows its end date. */
export const eventInWeekend = (
  dateStart: string,
  dateEnd: string | null,
  weekend: { saturday: Date; sunday: Date }
): boolean => {
  const satISO = toISODate(weekend.saturday);
  const sunISO = toISODate(weekend.sunday);
  const start = dateStart;
  const end = dateEnd ?? dateStart;

  // Standard overlap: event touches Sat or Sun of this weekend.
  if (start <= sunISO && end >= satISO) return true;

  // Weekday-only event: attach to the Saturday immediately after `end`.
  const endDate = new Date(`${end}T00:00:00`);
  const startDate = new Date(`${start}T00:00:00`);
  if (isNaN(endDate.getTime()) || isNaN(startDate.getTime())) return false;

  // Range length in days
  const dayMs = 86400000;
  const rangeDays = Math.round((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
  // If range spans 6+ days it necessarily includes a Sat or Sun → overlap would have caught it.
  if (rangeDays >= 6) return false;
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false; // has a weekend day → not weekday-only
  }
  // Find Saturday strictly after end date.
  const followingSat = new Date(endDate);
  const endDow = endDate.getDay(); // 1..5 here
  followingSat.setDate(endDate.getDate() + (6 - endDow));
  return toISODate(followingSat) === satISO;
};


export const todayISO = (): string => toISODate(startOfDay(new Date()));

export const isPastEvent = (dateStart: string, dateEnd: string | null): boolean => {
  const end = dateEnd ?? dateStart;
  return end < todayISO();
};

/**
 * Ordre d'affichage d'un événement au sein d'une semaine :
 * 0 = court (journée / week-end), 1 = long (expo, festival), 2 = terminé.
 * Sans ça, une expo démarrée en mai remonte au même niveau qu'un atelier du jour.
 */
export const eventSortRank = (dateStart: string, dateEnd: string | null): number => {
  if (isPastEvent(dateStart, dateEnd)) return 2;
  return isShortEvent(dateStart, dateEnd) ? 0 : 1;
};

/**
 * Événement « court » : sur une journée ou un week-end (≤ 3 jours), par
 * opposition aux expos et festivals qui courent sur plusieurs semaines.
 * Sert à prioriser l'affichage dans une semaine (courts d'abord).
 */
export const isShortEvent = (dateStart: string, dateEnd: string | null): boolean => {
  if (!dateEnd || dateEnd === dateStart) return true;
  const start = new Date(`${dateStart}T00:00:00`);
  const end = new Date(`${dateEnd}T00:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  return days <= 3;
};

export { toISODate };

// ---------- Weekly grouping (Mon → Sun) ----------

export interface Week {
  key: string; // ISO date of Monday
  monday: Date;
  sunday: Date;
  label: string;
  past?: boolean;
}

/** Monday of the week containing `from`. */
const mondayOf = (from: Date): Date => {
  const d = startOfDay(from);
  const dow = d.getDay(); // 0 Sun..6 Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

export const currentWeekKey = (from: Date = new Date()): string =>
  toISODate(mondayOf(from));

export const buildWeeks = (
  count = 8,
  from: Date = new Date(),
  includeLast = true,
): Week[] => {
  const currentMonday = mondayOf(from);
  const currentKey = toISODate(currentMonday);
  const result: Week[] = [];
  const startI = includeLast ? -1 : 0;

  for (let i = startI; i < count; i++) {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() + i * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const key = toISODate(mon);
    const past = i < 0;
    let label: string;
    if (past) label = 'Semaine dernière';
    else if (key === currentKey) label = 'Cette semaine';
    else {
      const day = mon.getDate();
      const month = monthShort(mon);
      label = `Semaine du ${day} ${month}`;
    }
    result.push({ key, monday: mon, sunday: sun, label, past });
  }
  return result;
};

/** Does an event overlap the given week (Mon..Sun)? */
export const eventInWeek = (
  dateStart: string,
  dateEnd: string | null,
  week: { monday: Date; sunday: Date },
): boolean => {
  const monISO = toISODate(week.monday);
  const sunISO = toISODate(week.sunday);
  const start = dateStart;
  const end = dateEnd ?? dateStart;
  return start <= sunISO && end >= monISO;
};
