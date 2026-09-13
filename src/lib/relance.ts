export type RelanceKind = 'zone' | 'channel';

/** 30 jours : un compte doit avoir eu le temps de vivre avant qu'on lui
 *  redemande quelque chose. Même délai que le snooze du hook enfants. */
export const RELANCE_DELAY_MS = 30 * 24 * 60 * 60 * 1000;

export interface RelanceInput {
  createdAt: string | null;
  zoneCity: string | null;
  digestEmailEnabled: boolean;
  digestPushEnabled: boolean;
  snoozed: boolean;
}

/**
 * Quelle relance proposer, s'il y en a une. Une seule à la fois, la zone
 * d'abord : sans zone, un canal choisi n'a rien de plus proche à proposer.
 * Renvoie `null` dès que la donnée est renseignée — la bannière disparaît
 * alors d'elle-même, sans attendre la fin d'un snooze.
 */
export const pendingRelanceKind = (input: RelanceInput, now: number = Date.now()): RelanceKind | null => {
  const createdAt = input.createdAt ? Date.parse(input.createdAt) : NaN;
  if (!Number.isFinite(createdAt) || now - createdAt < RELANCE_DELAY_MS) return null;
  if (input.snoozed) return null;
  if (!input.zoneCity) return 'zone';
  if (!input.digestEmailEnabled && !input.digestPushEnabled) return 'channel';
  return null;
};
