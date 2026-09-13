import { ChildAgeBucket } from './ageFilter';
import { ChildFilterSelection, selectionFromStorageValue, selectionStorageValue } from './children';

const SELECTED_FILTER_KEY = 'children.selectedFilter';
const HOOK_SNOOZE_KEY = 'childrenHook.snoozeUntil';
const RELANCE_SNOOZE_KEY = 'accountRelance.snoozeUntil';
const ageBandSeenKey = (childId: string) => `ageBandSeen.${childId}`;

const safeGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
};

const safeRemove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

// --- Sélection de filtre enfant, partagée Explorer/Sorties ---

export const loadSelectedFilter = (): ChildFilterSelection => selectionFromStorageValue(safeGet(SELECTED_FILTER_KEY));

export const saveSelectedFilter = (selection: ChildFilterSelection) => {
  const value = selectionStorageValue(selection);
  if (value) safeSet(SELECTED_FILTER_KEY, value);
  else safeRemove(SELECTED_FILTER_KEY);
};

// --- Snooze du hook enfants (30 jours) — clé DISTINCTE du snooze de la
// bannière de relance : les deux gouvernent des surfaces différentes. ---
//
// Les deux clés sont scopées par compte : sur un navigateur partagé (tablette
// familiale), un « Plus tard » du compte A ne doit pas faire taire la relance
// du compte B pendant 30 jours. `anon` couvre le hook vu déconnecté, seule
// surface des deux qui s'affiche sans compte.

const isSnoozed = (key: string): boolean => {
  const raw = safeGet(key);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
};

const snooze = (key: string, days: number) => {
  safeSet(key, String(Date.now() + days * 24 * 60 * 60 * 1000));
};

const scopedKey = (base: string, userId: string | null | undefined) => `${base}.${userId ?? 'anon'}`;

export const isHookSnoozed = (userId: string | null | undefined): boolean =>
  isSnoozed(scopedKey(HOOK_SNOOZE_KEY, userId));
export const snoozeHook = (userId: string | null | undefined, days = 30): void =>
  snooze(scopedKey(HOOK_SNOOZE_KEY, userId), days);

export const isRelanceSnoozed = (userId: string | null | undefined): boolean =>
  isSnoozed(scopedKey(RELANCE_SNOOZE_KEY, userId));
export const snoozeRelance = (userId: string | null | undefined, days = 30): void =>
  snooze(scopedKey(RELANCE_SNOOZE_KEY, userId), days);

// --- Dernière tranche connue par enfant, pour détecter un franchissement ---

export const getAgeBandSeen = (childId: string): ChildAgeBucket | null => {
  const raw = safeGet(ageBandSeenKey(childId));
  return raw === '0-2' || raw === '3-5' || raw === '6+' ? raw : null;
};

export const setAgeBandSeen = (childId: string, band: ChildAgeBucket): void => {
  safeSet(ageBandSeenKey(childId), band);
};
