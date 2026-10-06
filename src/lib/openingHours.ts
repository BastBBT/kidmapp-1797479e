// Horaires d'ouverture des lieux (colonne `locations.opening_hours`).
//
// Format repris de Google Places (New) `regularOpeningHours.periods` :
//   { periods: [{ open: { day, hour, minute }, close?: { day, hour, minute } }] }
// `day` : 0 = dimanche … 6 = samedi. Une période sans `close` = ouvert 24h/24.
// Une période peut chevaucher minuit (close.day = lendemain) ou la fin de semaine
// (ouverture samedi, fermeture dimanche → day 6 → day 0).
//
// Le statut se calcule toujours dans le fuseau du lieu (Europe/Paris), jamais dans celui de
// l'appareil : un parent en déplacement doit voir l'heure de Nantes.

export interface TimePoint { day: number; hour: number; minute: number }
export interface OpeningPeriod { open: TimePoint; close?: TimePoint }
export interface OpeningHours { periods: OpeningPeriod[] }

export const LOCATION_TIME_ZONE = 'Europe/Paris';

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

// Ordre d'affichage : lundi en premier.
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Nom du jour (0 = dimanche) dans la langue `locale`, ex. « mardi », « Tuesday ». */
export function dayName(day: number, locale: string): string {
  // Le 4 janvier 2026 est un dimanche : on décale de `day` jours.
  return new Date(2026, 0, 4 + day).toLocaleDateString(locale, { weekday: 'long' });
}

function isTimePoint(v: unknown): v is TimePoint {
  const t = v as TimePoint;
  return (
    !!t && Number.isInteger(t.day) && t.day >= 0 && t.day <= 6 &&
    Number.isInteger(t.hour) && t.hour >= 0 && t.hour <= 24 &&
    Number.isInteger(t.minute) && t.minute >= 0 && t.minute <= 59
  );
}

/** Lit la valeur jsonb brute ; renvoie null si absente, vide ou malformée. */
export function parseOpeningHours(raw: unknown): OpeningHours | null {
  const periods = (raw as { periods?: unknown })?.periods;
  if (!Array.isArray(periods)) return null;
  const valid = periods.filter(
    (p): p is OpeningPeriod => isTimePoint(p?.open) && (p.close === undefined || isTimePoint(p.close)),
  );
  return valid.length > 0 ? { periods: valid } : null;
}

const toWeekMinutes = (t: TimePoint) => t.day * MINUTES_PER_DAY + t.hour * 60 + t.minute;

export function isAlwaysOpen(hours: OpeningHours): boolean {
  return hours.periods.some((p) => !p.close);
}

/** Jour (0-6) et minutes écoulées dans la semaine, à l'heure de Paris. */
export function weekMinutesInParis(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LOCATION_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return day * MINUTES_PER_DAY + parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
}

export type OpenStatus =
  | { kind: 'always_open' }
  | { kind: 'open'; closesAt: TimePoint; closesInDays: number }
  | { kind: 'closed'; opensAt: TimePoint; opensInDays: number }
  | { kind: 'closed_indefinitely' };

/**
 * Statut à l'instant `now`. `closesInDays` / `opensInDays` : 0 = aujourd'hui, 1 = demain, …
 * (pour formuler « ferme à 18:00 » vs « ouvre demain à 9:30 » vs « ouvre lundi à 9:30 »).
 */
export function openStatus(hours: OpeningHours, now: Date = new Date()): OpenStatus {
  if (isAlwaysOpen(hours)) return { kind: 'always_open' };

  const m = weekMinutesInParis(now);
  // Nombre de jours calendaires (à Paris) entre maintenant et un instant `delta` minutes plus tard.
  const daysAhead = (delta: number) => Math.floor(((m % MINUTES_PER_DAY) + delta) / MINUTES_PER_DAY);

  for (const p of hours.periods) {
    const o = toWeekMinutes(p.open);
    let c = toWeekMinutes(p.close!);
    if (c <= o) c += MINUTES_PER_WEEK;
    // `m + semaine` couvre une période ouverte samedi soir et fermée dimanche matin.
    const shifted = m >= o && m < c ? m : m + MINUTES_PER_WEEK;
    if (shifted >= o && shifted < c) {
      return { kind: 'open', closesAt: p.close!, closesInDays: daysAhead(c - shifted) };
    }
  }

  let best: { period: OpeningPeriod; delta: number } | null = null;
  for (const p of hours.periods) {
    const delta = (toWeekMinutes(p.open) - m + MINUTES_PER_WEEK) % MINUTES_PER_WEEK || MINUTES_PER_WEEK;
    if (!best || delta < best.delta) best = { period: p, delta };
  }
  if (!best) return { kind: 'closed_indefinitely' };
  return { kind: 'closed', opensAt: best.period.open, opensInDays: daysAhead(best.delta) };
}

export function formatTime(t: TimePoint): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

/** Créneaux d'un jour (0-6), triés, au format « 09:30 – 12:30 ». Vide = fermé ce jour-là. */
export function rangesForDay(hours: OpeningHours, day: number): string[] {
  return hours.periods
    .filter((p) => p.open.day === day && p.close)
    .sort((a, b) => toWeekMinutes(a.open) - toWeekMinutes(b.open))
    .map((p) => `${formatTime(p.open)} – ${formatTime(p.close!)}`);
}

/** Jour courant à Paris (0-6), pour mettre la ligne du jour en avant. */
export function todayInParis(now: Date = new Date()): number {
  return Math.floor(weekMinutesInParis(now) / MINUTES_PER_DAY);
}
