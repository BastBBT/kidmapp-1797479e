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

export const PLATFORMS = ['web', 'ios', 'android'] as const;
export type SpotlightPlatform = (typeof PLATFORMS)[number];

/** Appareils uniques vus et ayant cliqué sur une plateforme. */
export interface PlatformStats {
  viewers: number;
  clickers: number;
}

/**
 * Statistiques d'une mise en avant, telles que les renvoie `admin_event_spotlight_stats`.
 *
 * Les six premiers champs existent depuis la première version de la fonction : absents ou illisibles,
 * ils valent 0. Les suivants sont arrivés avec la version enrichie : absents ou illisibles, ils valent
 * `null` (« inconnu »), jamais 0, pour ne pas faire croire à une absence de clics quand la base
 * n'a simplement pas encore la nouvelle version.
 */
export interface SpotlightStats {
  id: string;
  shown: number;
  shownLast: number;
  opens: number;
  calendarAdds: number;
  dismisses: number;
  uniqueViewers: number;
  /** Sessions (ouvertures d'app) où la pop-in a été montrée. */
  sessionsShown: number | null;
  /** Sessions où un parent a tapé « Voir » ou « Ajouter au calendrier ». */
  sessionsClicked: number | null;
  /** Appareils qui ont tapé « Voir » ou « Ajouter au calendrier ». */
  uniqueClickers: number | null;
  uniqueOpeners: number | null;
  uniqueCalendarAdders: number | null;
  uniqueDismissers: number | null;
  /** Premier et dernier affichage, ISO ; `null` sans affichage ou sans donnée. */
  firstShownAt: string | null;
  lastShownAt: string | null;
  /** `null` pour une plateforme sans donnée lisible. */
  byPlatform: Record<SpotlightPlatform, PlatformStats | null>;
}

/** Pour les champs historiques : tout ce qui n'est pas un nombre vaut 0. */
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Pour les champs récents : un compte lisible (entier positif ou nul), sinon « inconnu ». */
const known = (v: unknown): number | null => {
  if (typeof v === 'string' && v.trim() === '') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const knownDate = (v: unknown): string | null =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;

const platformStats = (v: unknown): PlatformStats | null => {
  if (typeof v !== 'object' || v === null) return null;
  const viewers = known((v as Record<string, unknown>).viewers);
  const clickers = known((v as Record<string, unknown>).clickers);
  return viewers === null || clickers === null ? null : { viewers, clickers };
};

/** Lecture prudente du JSON de la fonction : une ligne mal formée est ignorée. */
export const parseSpotlightStats = (raw: unknown): Record<string, SpotlightStats> => {
  const out: Record<string, SpotlightStats> = {};
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== 'string') continue;
    const bp = typeof r.byPlatform === 'object' && r.byPlatform !== null ? (r.byPlatform as Record<string, unknown>) : {};
    out[r.id] = {
      id: r.id,
      shown: num(r.shown),
      shownLast: num(r.shownLast),
      opens: num(r.opens),
      calendarAdds: num(r.calendarAdds),
      dismisses: num(r.dismisses),
      uniqueViewers: num(r.uniqueViewers),
      sessionsShown: known(r.sessionsShown),
      sessionsClicked: known(r.sessionsClicked),
      uniqueClickers: known(r.uniqueClickers),
      uniqueOpeners: known(r.uniqueOpeners),
      uniqueCalendarAdders: known(r.uniqueCalendarAdders),
      uniqueDismissers: known(r.uniqueDismissers),
      firstShownAt: knownDate(r.firstShownAt),
      lastShownAt: knownDate(r.lastShownAt),
      byPlatform: { web: platformStats(bp.web), ios: platformStats(bp.ios), android: platformStats(bp.android) },
    };
  }
  return out;
};

/** Statistiques d'une mise en avant sans ligne de résultat : le passé vaut 0, tout le reste est inconnu. */
export const unknownSpotlightStats = (id: string): SpotlightStats =>
  parseSpotlightStats([{ id, shown: 0, shownLast: 0, opens: 0, calendarAdds: 0, dismisses: 0, uniqueViewers: 0 }])[id];

/** Part de `part` dans `total`, en pour cent entier ; `null` sans affichage. */
export const percentOf = (part: number, total: number): number | null =>
  total > 0 ? Math.round((part / total) * 100) : null;

/** Taux d'appareils ayant cliqué ; `null` si le nombre de clics est inconnu ou s'il n'y a aucun appareil. */
export const clickRate = (clickers: number | null, viewers: number): number | null =>
  clickers === null ? null : percentOf(clickers, viewers);

/** Un compte pour l'affichage : « — » quand il est inconnu, jamais 0. */
export const countLabel = (n: number | null): string => (n === null ? '—' : n.toLocaleString('fr-FR'));

export const rateLabel = (rate: number | null): string => (rate === null ? '—' : `${rate} %`);

const parisDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', ...opts });

/** « Vue du 12 nov. au 19 nov. », « Vue le 12 nov. », ou `null` sans affichage connu. */
export const viewedLabel = (first: string | null, last: string | null): string | null => {
  if (!first || !last) return null;
  const a = parisDay(first, { day: 'numeric', month: 'short' });
  const b = parisDay(last, { day: 'numeric', month: 'short' });
  return a === b ? `Vue le ${a}` : `Vue du ${a} au ${b}`;
};
