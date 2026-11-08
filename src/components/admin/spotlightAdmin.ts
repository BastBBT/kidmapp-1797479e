// Logique de l'onglet admin « À la une » : statut, chevauchements, validation, statistiques.
// Pure, sans React ni Supabase, pour être testée seule.

import { addDaysISO, dateFromISO } from '@/lib/eventCalendar';
import { reminderWindow, type SpotlightFrequency } from '@/lib/eventSpotlight';

export const HEADLINE_MAX = 50;
export const MESSAGE_MAX = 140;

export type SpotlightStatus = 'planned' | 'active' | 'ended';

export interface SpotlightPeriod {
  id?: string;
  starts_on: string;
  ends_on: string;
}

export interface SpotlightForm {
  event_id: string;
  headline: string;
  message: string;
  starts_on: string;
  ends_on: string;
  frequency: SpotlightFrequency;
  show_calendar_cta: boolean;
  show_photo: boolean;
  last_reminder: boolean;
}

/** Valeurs d'une nouvelle mise en avant : une fois par week-end, avec calendrier, photo et rappel. */
export const emptySpotlightForm = (today: string): SpotlightForm => ({
  event_id: '',
  headline: '',
  message: '',
  starts_on: today,
  ends_on: today,
  frequency: 'weekend',
  show_calendar_cta: true,
  show_photo: true,
  last_reminder: true,
});

export const spotlightStatus = (p: SpotlightPeriod, today: string): SpotlightStatus =>
  today < p.starts_on ? 'planned' : today <= p.ends_on ? 'active' : 'ended';

/** Autres mises en avant dont la période croise celle-ci (bornes incluses). */
export const overlapsOf = <T extends SpotlightPeriod>(candidate: SpotlightPeriod, others: readonly T[]): T[] => {
  if (!candidate.starts_on || !candidate.ends_on || candidate.ends_on < candidate.starts_on) return [];
  return others.filter(
    (o) => o.id !== candidate.id && o.starts_on <= candidate.ends_on && o.ends_on >= candidate.starts_on,
  );
};

export type EndShortcut = 'dayJ' | 'eventEnd' | 'week';

/** Date de fin proposée par un raccourci. `null` si la donnée manque. */
export const endForShortcut = (
  shortcut: EndShortcut,
  startsOn: string,
  event: { date_start: string; date_end: string | null } | null,
): string | null => {
  if (shortcut === 'week') return startsOn ? addDaysISO(startsOn, 6) : null;
  if (!event) return null;
  return shortcut === 'dayJ' ? event.date_start : event.date_end ?? event.date_start;
};

export const STALE_DATES_WARNING =
  'Les dates enregistrées de cette sortie sont passées : la mise en avant ne sera visible du public que si un créneau à venir existe.';

/**
 * Les dates portées par la sortie sont toutes passées. Pour une sortie à plusieurs créneaux, elles
 * peuvent être périmées alors qu'un créneau à venir existe : la règle de lecture publique ne peut
 * alors pas la voir tant que la base ne regarde pas aussi les créneaux.
 */
export const hasStaleDates = (event: { date_start: string; date_end: string | null } | null, today: string): boolean =>
  !!event && (event.date_end ?? event.date_start) < today;

/** La période contient-elle au moins un jour de week-end (jeudi à dimanche) ? Une semaine suffit à le savoir. */
const hasWeekendDay = (from: string, to: string): boolean => {
  const last = addDaysISO(from, 6) < to ? addDaysISO(from, 6) : to;
  for (let day = from; day <= last; day = addDaysISO(day, 1)) {
    const dow = dateFromISO(day).getDay();
    if (dow === 0 || dow >= 4) return true;
  }
  return false;
};

export interface SpotlightIssues {
  /** Empêchent l'enregistrement. */
  errors: string[];
  /** Avertissent sans bloquer. */
  warnings: string[];
}

export const validateSpotlight = (
  form: SpotlightForm,
  event: { date_start: string; date_end: string | null } | null,
  overlapping: readonly { headline: string }[],
  today: string,
): SpotlightIssues => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stale = hasStaleDates(event, today);
  if (!form.event_id) errors.push('Choisis la sortie à mettre en avant.');
  if (stale) warnings.push(STALE_DATES_WARNING);
  const headline = form.headline.trim();
  if (!headline) errors.push("L'accroche est obligatoire.");
  else if (headline.length > HEADLINE_MAX) errors.push(`L'accroche dépasse ${HEADLINE_MAX} caractères.`);
  if (form.message.length > MESSAGE_MAX) errors.push(`Le texte dépasse ${MESSAGE_MAX} caractères.`);
  if (!form.starts_on || !form.ends_on) errors.push('Renseigne une date de début et de fin.');
  else if (form.ends_on < form.starts_on) errors.push('La fin tombe avant le début.');
  else {
    if (event && !stale && form.ends_on > (event.date_end ?? event.date_start)) {
      warnings.push('La mise en avant se termine après la sortie : elle disparaîtra de toute façon une fois la sortie passée.');
    }
    // Sans dates fiables (sortie à dates périmées), on ne sait pas où tombent J-3 à J : on se tait.
    if (event && !stale) {
      const jDay = event.date_start;
      const window = reminderWindow(form, jDay);
      if (!window && form.frequency === 'weekend' && !hasWeekendDay(form.starts_on, form.ends_on)) {
        warnings.push(
          "Avec ces réglages, la pop-in ne s'affichera jamais : la période ne contient ni jour de week-end (jeudi à dimanche) ni fenêtre de dernier rappel (J-3 à J). Élargis la période ou active le dernier rappel.",
        );
      } else if (form.last_reminder && !window) {
        const singleDay = !event.date_end || event.date_end === event.date_start;
        if (form.ends_on < addDaysISO(jDay, -3) || (singleDay && form.starts_on > jDay)) {
          warnings.push('Le dernier rappel ne pourra pas s\'afficher : la période ne couvre pas les trois jours qui précèdent la sortie.');
        }
      }
    }
    if (overlapping.length > 0) {
      const names = overlapping.map((o) => `« ${o.headline} »`).join(', ');
      warnings.push(`Cette période chevauche ${names}. Une seule s'affiche à la fois : la plus récente l'emporte.`);
    }
  }
  return { errors, warnings };
};

/** Statistiques d'une mise en avant, telles que les renvoie `admin_event_spotlight_stats`. */
export interface SpotlightStats {
  id: string;
  shown: number;
  shownLast: number;
  opens: number;
  calendarAdds: number;
  dismisses: number;
  uniqueViewers: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Lecture prudente du JSON de la fonction : une ligne mal formée est ignorée. */
export const parseSpotlightStats = (raw: unknown): Record<string, SpotlightStats> => {
  const out: Record<string, SpotlightStats> = {};
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string') continue;
    out[r.id] = {
      id: r.id,
      shown: num(r.shown),
      shownLast: num(r.shownLast),
      opens: num(r.opens),
      calendarAdds: num(r.calendarAdds),
      dismisses: num(r.dismisses),
      uniqueViewers: num(r.uniqueViewers),
    };
  }
  return out;
};

/** Part de `part` dans `total`, en pour cent entier ; `null` sans affichage. */
export const percentOf = (part: number, total: number): number | null =>
  total > 0 ? Math.round((part / total) * 100) : null;
