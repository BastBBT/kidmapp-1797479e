// Utilities for weekend selection (Sat/Sun pairs).

export interface Weekend {
  key: string;          // ISO date of the Saturday
  saturday: Date;
  sunday: Date;
  label: string;        // e.g. "Ce week-end", "Sam 20 juil.", or "20–21 juil."
  shortLabel: string;   // e.g. "Sam 20", "20–21 juil."
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
export const buildWeekends = (count = 8, from: Date = new Date()): Weekend[] => {
  const now = startOfDay(from);
  const dow = now.getDay();
  // Start Saturday: for Sun (0), start on yesterday's Sat.
  const first = new Date(now);
  if (dow === 0) first.setDate(first.getDate() - 1);
  else if (dow < 6) first.setDate(first.getDate() + (6 - dow));

  const result: Weekend[] = [];
  const currentWeekendKey = toISODate(first);

  for (let i = 0; i < count; i++) {
    const sat = new Date(first);
    sat.setDate(first.getDate() + i * 7);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const key = toISODate(sat);
    const sameMonth = sat.getMonth() === sun.getMonth();
    const shortLabel = sameMonth
      ? `${sat.getDate()}–${sun.getDate()} ${monthShort(sun)}`
      : `${sat.getDate()} ${monthShort(sat)}–${sun.getDate()} ${monthShort(sun)}`;
    const label = key === currentWeekendKey ? 'Ce week-end' : shortLabel;
    result.push({ key, saturday: sat, sunday: sun, label, shortLabel });
  }
  return result;
};

export const currentWeekendKey = (from: Date = new Date()): string => {
  const now = startOfDay(from);
  const dow = now.getDay();
  const sat = new Date(now);
  if (dow === 0) sat.setDate(sat.getDate() - 1);
  else if (dow < 6) sat.setDate(sat.getDate() + (6 - dow));
  return toISODate(sat);
};

/** Does this event fall on the given weekend? Considers date_start..date_end overlap. */
export const eventInWeekend = (
  dateStart: string,
  dateEnd: string | null,
  weekend: { saturday: Date; sunday: Date }
): boolean => {
  const satISO = toISODate(weekend.saturday);
  const sunISO = toISODate(weekend.sunday);
  const start = dateStart;
  const end = dateEnd ?? dateStart;
  return start <= sunISO && end >= satISO;
};

export const todayISO = (): string => toISODate(startOfDay(new Date()));

export const isPastEvent = (dateStart: string, dateEnd: string | null): boolean => {
  const end = dateEnd ?? dateStart;
  return end < todayISO();
};

export { toISODate };
