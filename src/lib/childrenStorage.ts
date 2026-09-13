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

const isSnoozed = (key: string): boolean => {
  const raw = safeGet(key);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
};

const snooze = (key: string, days: number) => {
  safeSet(key, String(Date.now() + days * 24 * 60 * 60 * 1000));
};

export const isHookSnoozed = (): boolean => isSnoozed(HOOK_SNOOZE_KEY);
export const snoozeHook = (days = 30): void => snooze(HOOK_SNOOZE_KEY, days);

export const isRelanceSnoozed = (): boolean => isSnoozed(RELANCE_SNOOZE_KEY);
export const snoozeRelance = (days = 30): void => snooze(RELANCE_SNOOZE_KEY, days);

// --- Dernière tranche connue par enfant, pour détecter un franchissement ---

export const getAgeBandSeen = (childId: string): ChildAgeBucket | null => {
  const raw = safeGet(ageBandSeenKey(childId));
  return raw === '0-2' || raw === '3-5' || raw === '6+' ? raw : null;
};

export const setAgeBandSeen = (childId: string, band: ChildAgeBucket): void => {
  safeSet(ageBandSeenKey(childId), band);
};
