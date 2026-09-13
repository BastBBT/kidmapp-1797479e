import { bucketForChildMonths, ChildAgeBucket } from './ageFilter';

export interface Child {
  id: string;
  user_id: string;
  first_name: string | null;
  birth_month: number; // 1-12
  birth_year: number;
  created_at: string;
}

// Stock fixe de 16 emojis non genrés, indexé par une somme des code-points de
// l'id (UUID) modulo 16 — stable tant que l'enfant existe, contrairement à un
// hash de session. Miroir de `Child.filterEmoji` (iOS) / `Child.filterEmoji`
// (Android) : NE PAS changer l'ordre, un même enfant doit garder le même
// emoji sur les trois plateformes.
const FILTER_EMOJIS = [
  '🦖', '🌈', '🧸', '🎈', '🪁', '🦄', '🐣', '🍭',
  '🚀', '🎨', '⚽️', '🐶', '🐱', '🎠', '🧩', '🌟',
];

export const childFilterEmoji = (id: string): string => {
  let sum = 0;
  for (const ch of id) sum += ch.codePointAt(0) ?? 0;
  return FILTER_EMOJIS[sum % FILTER_EMOJIS.length];
};

/** Âge en mois recalculé à la volée — jamais stocké (minimisation RGPD). */
export const ageInMonths = (
  child: Pick<Child, 'birth_month' | 'birth_year'>,
  now: Date = new Date(),
): number => {
  const months = (now.getFullYear() - child.birth_year) * 12 + (now.getMonth() + 1 - child.birth_month);
  return Math.max(0, months);
};

export const childDisplayLabel = (child: Pick<Child, 'first_name'>, fallback: string): string => {
  const trimmed = child.first_name?.trim();
  return trimmed ? trimmed : fallback;
};

export type ChildFilterSelection =
  | { kind: 'none' }
  | { kind: 'allChildren' }
  | { kind: 'child'; id: string };

export const NONE_SELECTION: ChildFilterSelection = { kind: 'none' };
export const ALL_CHILDREN_SELECTION: ChildFilterSelection = { kind: 'allChildren' };

const ALL_CHILDREN_STORAGE_VALUE = '__all__';

export const selectionStorageValue = (selection: ChildFilterSelection): string => {
  switch (selection.kind) {
    case 'none': return '';
    case 'allChildren': return ALL_CHILDREN_STORAGE_VALUE;
    case 'child': return selection.id;
  }
};

export const selectionFromStorageValue = (raw: string | null): ChildFilterSelection => {
  if (!raw) return NONE_SELECTION;
  if (raw === ALL_CHILDREN_STORAGE_VALUE) return ALL_CHILDREN_SELECTION;
  return { kind: 'child', id: raw };
};

/**
 * Résout la sélection en tranches d'âge effectives. Un enfant supprimé
 * ailleurs (autre appareil) retombe silencieusement sur aucun filtre plutôt
 * que de planter — miroir de `ChildFilterSelection.ageBands(in:)` (iOS).
 */
export const resolveAgeBucketsForSelection = (
  selection: ChildFilterSelection,
  children: Child[],
): Set<ChildAgeBucket> => {
  switch (selection.kind) {
    case 'none':
      return new Set();
    case 'allChildren':
      return new Set(children.map((c) => bucketForChildMonths(ageInMonths(c))));
    case 'child': {
      const child = children.find((c) => c.id === selection.id);
      return child ? new Set([bucketForChildMonths(ageInMonths(child))]) : new Set();
    }
  }
};
