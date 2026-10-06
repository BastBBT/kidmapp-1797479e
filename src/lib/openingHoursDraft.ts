// Brouillon d'édition des horaires dans l'admin, et conversion vers/depuis le format jsonb
// `locations.opening_hours` (voir openingHours.ts).

import {
  dayName,
  formatTime,
  parseOpeningHours,
  type OpeningHours,
  type OpeningPeriod,
} from '@/lib/openingHours';

export interface HoursRange { open: string; close: string }

export interface HoursDraft {
  alwaysOpen: boolean;
  /** Index = jour (0 = dimanche … 6 = samedi). */
  days: HoursRange[][];
}

export interface OpeningHoursAdminState {
  googlePlaceId: string;
  savedGooglePlaceId: string;
  draft: HoursDraft;
  dirty: boolean;
  source: string | null;
  updatedAt: string | null;
}

const emptyDays = (): HoursRange[][] => Array.from({ length: 7 }, () => []);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function hoursToDraft(raw: unknown): HoursDraft {
  const hours = parseOpeningHours(raw);
  if (!hours) return { alwaysOpen: false, days: emptyDays() };
  if (hours.periods.some((p) => !p.close)) return { alwaysOpen: true, days: emptyDays() };
  const days = emptyDays();
  for (const p of hours.periods) days[p.open.day].push({ open: formatTime(p.open), close: formatTime(p.close!) });
  days.forEach((d) => d.sort((a, b) => a.open.localeCompare(b.open)));
  return { alwaysOpen: false, days };
}

export function initialAdminState(loc: {
  google_place_id?: string | null;
  opening_hours?: unknown;
  opening_hours_source?: string | null;
  opening_hours_updated_at?: string | null;
}): OpeningHoursAdminState {
  return {
    googlePlaceId: loc.google_place_id ?? '',
    savedGooglePlaceId: loc.google_place_id ?? '',
    draft: hoursToDraft(loc.opening_hours),
    dirty: false,
    source: loc.opening_hours_source ?? null,
    updatedAt: loc.opening_hours_updated_at ?? null,
  };
}

const toPoint = (day: number, hhmm: string) => {
  const [hour, minute] = hhmm.split(':').map(Number);
  return { day, hour, minute };
};

/**
 * Brouillon → valeur jsonb. Renvoie `{ error }` si un créneau est invalide, `{ value: null }` si
 * aucun créneau n'est saisi (= horaires non communiqués).
 */
export function draftToHours(draft: HoursDraft): { value: OpeningHours | null } | { error: string } {
  if (draft.alwaysOpen) return { value: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] } };
  const periods: OpeningPeriod[] = [];
  for (let day = 0; day < 7; day++) {
    for (const r of draft.days[day]) {
      if (!TIME_RE.test(r.open) || !TIME_RE.test(r.close)) {
        return { error: `Horaire invalide le ${dayName(day, 'fr-FR')} (format HH:MM).` };
      }
      if (r.open === r.close) return { error: `Créneau vide le ${dayName(day, 'fr-FR')}.` };
      // Fermeture « avant » l'ouverture = après minuit, le lendemain.
      const closeDay = r.close < r.open ? (day + 1) % 7 : day;
      periods.push({ open: toPoint(day, r.open), close: toPoint(closeDay, r.close) });
    }
  }
  return { value: periods.length > 0 ? { periods } : null };
}
