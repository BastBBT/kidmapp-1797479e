// Règle d'affichage de la pop-in « À la une » (mise en avant d'une sortie sur l'accueil).
// Module pur : tout dépend de `now` et de l'état passé en paramètre, rien ne lit l'horloge.
//
// Comportement (identique sur iOS, Android et web) :
//  - la période de la mise en avant (`starts_on`…`ends_on`, jours calendaires) borne tout ;
//  - le week-end commence le jeudi à 12 h (heure de l'appareil) et finit le dimanche ;
//  - fréquence `weekend` : une fois par week-end, à la première ouverture ; `daily` : une
//    fois par jour ; `once` : une seule fois sur toute la période ;
//  - un tap sur « Voir la sortie » ou « Ajouter au calendrier » arrête l'affichage, sauf pour
//    le dernier rappel ; la croix ou « Plus tard » ne compte que pour le week-end en cours ;
//  - dernier rappel (`last_reminder`) : entre J-3 et le jour J, pour tout le monde, même pour
//    qui a déjà agi, une fois. Il peut tomber avant jeudi 12 h. Pour un parent qui n'a pas agi,
//    l'affichage normal qui tombe dans cette fenêtre vaut rappel ; la période prime : le rappel
//    n'existe que dans la partie de J-3…J couverte par la période ;
//  - pendant le rappel, l'étiquette « À la une » devient un compte à rebours.

import { addDaysISO, dateFromISO } from '@/lib/eventCalendar';
import { toISODate } from '@/lib/weekend';
import type { EventOccurrence } from '@/types/event';

export type SpotlightFrequency = 'weekend' | 'daily' | 'once';

export const SPOTLIGHT_FREQUENCIES: readonly SpotlightFrequency[] = ['weekend', 'daily', 'once'];

export const isSpotlightFrequency = (value: unknown): value is SpotlightFrequency =>
  typeof value === 'string' && (SPOTLIGHT_FREQUENCIES as readonly string[]).includes(value);

/** Ce qu'il faut savoir d'une mise en avant pour décider de l'afficher. */
export interface SpotlightRule {
  id: string;
  starts_on: string;
  ends_on: string;
  frequency: SpotlightFrequency;
  last_reminder: boolean;
}

export interface SpotlightShow {
  /**
   * Jour de l'affichage, `YYYY-MM-DD`, heure de l'appareil. C'est tout ce que la règle lit : un
   * affichage dans la fenêtre du rappel vaut rappel, quelle qu'ait été sa nature. Les états écrits
   * avant le retrait du champ `last` portent encore ce champ : il est ignoré à la lecture.
   */
  day: string;
}

/** Mémoire « déjà vu » de cet appareil pour une mise en avant. */
export interface SpotlightState {
  shows: SpotlightShow[];
  /** A tapé « Voir la sortie » ou « Ajouter au calendrier ». */
  acted: boolean;
  /** A ajouté la sortie à son calendrier. */
  calendar: boolean;
}

export const EMPTY_SPOTLIGHT_STATE: SpotlightState = { shows: [], acted: false, calendar: false };

export interface SpotlightDecision {
  show: boolean;
  /** Vrai si l'affichage vaut dernier rappel (compte à rebours, journalisé `is_last`). */
  isLast: boolean;
  /** Jours entre aujourd'hui et le jour J, jamais négatif. */
  daysUntil: number;
}

/** Jeudi, 12 h : début du week-end. */
export const WEEKEND_START_HOUR = 12;
/** Le dernier rappel couvre de J-3 à J. */
export const REMINDER_DAYS = 3;

const MAX_STORED_SHOWS = 60;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const NO_SHOW: SpotlightDecision = { show: false, isLast: false, daysUntil: 0 };

const dayOf = (now: Date): string => toISODate(now);

const dowOf = (iso: string): number => dateFromISO(iso).getDay();

const daysBetween = (from: string, to: string): number =>
  Math.round((dateFromISO(to).getTime() - dateFromISO(from).getTime()) / 86400000);

/** Jeudi à vendredi, samedi, dimanche : les jours d'un week-end. */
const isWeekendDow = (dow: number): boolean => dow === 0 || dow >= 4;

/** Vrai à partir du jeudi 12 h, et jusqu'à la fin du dimanche. */
export const isWeekendEligible = (now: Date): boolean => {
  const dow = now.getDay();
  if (dow === 4) return now.getHours() >= WEEKEND_START_HOUR;
  return dow === 0 || dow >= 5;
};

/** Le week-end d'un jour : le dimanche qui clôt sa semaine (lundi → dimanche). */
export const weekendKey = (iso: string): string => {
  const dow = dowOf(iso);
  return addDaysISO(iso, dow === 0 ? 0 : 7 - dow);
};

/** Fenêtre du dernier rappel, bornée par la période. `null` s'il n'y en a pas. */
export const reminderWindow = (
  rule: Pick<SpotlightRule, 'starts_on' | 'ends_on' | 'last_reminder'>,
  eventDay: string,
): { from: string; to: string } | null => {
  if (!rule.last_reminder) return null;
  const rawFrom = addDaysISO(eventDay, -REMINDER_DAYS);
  const from = rawFrom > rule.starts_on ? rawFrom : rule.starts_on;
  const to = eventDay < rule.ends_on ? eventDay : rule.ends_on;
  return from <= to ? { from, to } : null;
};

/** Reste-t-il, dans la fenêtre, un moment où l'affichage normal du week-end se déclencherait ? */
const hasFutureWeekendSlot = (now: Date, win: { from: string; to: string }): boolean => {
  const today = dayOf(now);
  for (let day = today; day <= win.to; day = addDaysISO(day, 1)) {
    const dow = dowOf(day);
    if (day === today) {
      if (dow === 4 && now.getHours() < WEEKEND_START_HOUR) return true;
    } else if (isWeekendDow(dow)) {
      return true;
    }
  }
  return false;
};

/**
 * Faut-il afficher la mise en avant maintenant, et est-ce le dernier rappel ?
 * `eventDay` est le jour J : début de la sortie, ou de son prochain créneau si elle en a plusieurs.
 */
export const decideSpotlight = (
  now: Date,
  rule: SpotlightRule,
  eventDay: string,
  state: SpotlightState,
): SpotlightDecision => {
  const today = dayOf(now);
  if (today < rule.starts_on || today > rule.ends_on) return NO_SHOW;

  const daysUntil = Math.max(0, daysBetween(today, eventDay));
  const win = reminderWindow(rule, eventDay);
  const inWindow = win !== null && today >= win.from && today <= win.to;
  const shownToday = state.shows.some((s) => s.day === today);

  if (inWindow) {
    const reminded = state.shows.some((s) => s.day >= win.from && s.day <= win.to);
    const last = { show: true, isLast: true, daysUntil };
    if (state.acted) return reminded ? NO_SHOW : last;
    if (rule.frequency === 'daily') return shownToday ? NO_SHOW : last;
    if (reminded) return NO_SHOW;
    // L'affichage du week-end vaut rappel : on l'attend s'il doit encore arriver dans la fenêtre.
    if (rule.frequency === 'weekend' && !isWeekendEligible(now) && hasFutureWeekendSlot(now, win)) return NO_SHOW;
    return last;
  }

  if (state.acted) return NO_SHOW;
  const normal = { show: true, isLast: false, daysUntil };
  if (rule.frequency === 'daily') return shownToday ? NO_SHOW : normal;
  if (rule.frequency === 'once') return state.shows.length === 0 ? normal : NO_SHOW;
  if (!isWeekendEligible(now)) return NO_SHOW;
  const key = weekendKey(today);
  return state.shows.some((s) => weekendKey(s.day) === key) ? NO_SHOW : normal;
};

/** Compte à rebours de l'étiquette du dernier rappel. */
export type SpotlightCountdown = { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'days'; count: number };

export const countdownOf = (daysUntil: number): SpotlightCountdown => {
  if (daysUntil <= 0) return { kind: 'today' };
  if (daysUntil === 1) return { kind: 'tomorrow' };
  return { kind: 'days', count: daysUntil };
};

/** Note un affichage. Ne modifie pas l'état reçu. */
export const recordShown = (state: SpotlightState, now: Date): SpotlightState => ({
  ...state,
  shows: [...state.shows, { day: dayOf(now) }].slice(-MAX_STORED_SHOWS),
});

/** Note un tap sur « Voir la sortie » ou « Ajouter au calendrier ». */
export const recordAction = (state: SpotlightState, kind: 'open' | 'calendar'): SpotlightState => ({
  ...state,
  acted: true,
  calendar: state.calendar || kind === 'calendar',
});

/**
 * Créneau à venir d'une sortie à plusieurs dates : le premier qui n'est pas fini.
 * `null` s'il n'y a pas de créneau chargé (on retombe alors sur les dates de la sortie).
 */
export const pickOccurrence = (
  occurrences: readonly EventOccurrence[],
  today: string,
): EventOccurrence | null => {
  const sorted = [...occurrences].sort((a, b) => (a.date_start < b.date_start ? -1 : a.date_start > b.date_start ? 1 : 0));
  return sorted.find((o) => (o.date_end ?? o.date_start) >= today) ?? null;
};

// --- Mémoire sur l'appareil -------------------------------------------------

const storageKey = (id: string): string => `kidmapp_spotlight_${id}`;

const parseState = (raw: string | null): SpotlightState => {
  if (!raw) return EMPTY_SPOTLIGHT_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_SPOTLIGHT_STATE;
    const p = parsed as Record<string, unknown>;
    // Seul `day` compte ; l'ancien champ `last` d'un état déjà enregistré est ignoré, pas rejeté.
    const shows: SpotlightShow[] = Array.isArray(p.shows)
      ? p.shows.flatMap((s: unknown) => {
          if (typeof s !== 'object' || s === null) return [];
          const day = (s as { day?: unknown }).day;
          return typeof day === 'string' && DAY_RE.test(day) ? [{ day }] : [];
        })
      : [];
    return { shows, acted: p.acted === true, calendar: p.calendar === true };
  } catch {
    return EMPTY_SPOTLIGHT_STATE;
  }
};

/** Lit la mémoire de l'appareil ; toute erreur (stockage bloqué, valeur illisible) = rien vu. */
export const readSpotlightState = (id: string): SpotlightState => {
  try {
    return parseState(localStorage.getItem(storageKey(id)));
  } catch {
    return EMPTY_SPOTLIGHT_STATE;
  }
};

export const writeSpotlightState = (id: string, state: SpotlightState): void => {
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée) : au pire la pop-in reviendra à la visite suivante.
  }
};
