/** Types et palette partagés par l'onglet Audience et le Dashboard de l'admin. */

export type Platform = 'web' | 'ios' | 'android';

export type PlatformStats = {
  /** Lignes brutes `page_views`, historique compris. N'a de sens que pour le web :
   *  les apps n'écrivent qu'une ligne par session. */
  pageViews?: number;
  sessions: number;
  uniques: number;
  loggedUniques: number;
  recurring: number;
};

export type AudienceStats = {
  splitTrackingSince: string | null;
  byPlatform30d: Record<Platform, PlatformStats>;
  daily7dByPlatform: Record<string, Record<Platform, { pageViews?: number; sessions: number; uniques: number }>>;
  appVersions30d: { platform: Platform; version: string; uniques: number }[];
  uniqueLoggedVisitors30d: number;
  recurringVisitors30d: number;
  activePct30d: number;
  totalRegistered: number;
  newUsers30d: number;
};

export const PLATFORMS: { key: Platform; label: string; emoji: string; color: string }[] = [
  { key: 'web', label: 'Web', emoji: '🌐', color: '#E8A838' },
  { key: 'ios', label: 'iOS', emoji: '🍎', color: '#D95F3B' },
  { key: 'android', label: 'Android', emoji: '🤖', color: '#3B7D6E' },
];
