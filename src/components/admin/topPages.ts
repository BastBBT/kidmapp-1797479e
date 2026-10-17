import { isActivity } from '@/types/location';
import type { Platform } from './audiencePlatforms';

export type PlatformViews = { views30d: number; viewsTotal: number };
export type ByPlatform = Record<Platform, PlatformViews>;

/** Forme renvoyée par la RPC `admin_top_pages` (supabase/migrations/20261017120000). */
export type TopLocation = {
  id: string;
  name: string;
  category: string;
  city: string;
  viewsTotal: number;
  views30d: number;
  visitors30d: number;
  /** Ventilation des deux compteurs par plateforme d'origine de la visite. */
  byPlatform: ByPlatform;
};

export type TopEvent = {
  id: string;
  name: string;
  status: string;
  dateStart: string;
  recurrenceLabel: string | null;
  viewsTotal: number;
  views30d: number;
  visitors30d: number;
  /** Ventilation des deux compteurs par plateforme d'origine de la visite. */
  byPlatform: ByPlatform;
};

export type TopPagesStats = {
  trackingSince: string | null;
  locations: TopLocation[];
  events: TopEvent[];
};

export type PageSort = 'views30d' | 'viewsTotal';

/** Lieux et activités vivent dans la même table : on les sépare par catégorie, comme partout dans l'app. */
export function splitLocations(locations: TopLocation[]) {
  return {
    places: locations.filter((l) => !isActivity(l.category)),
    activities: locations.filter((l) => isActivity(l.category)),
  };
}

/** Tri décroissant sur la colonne choisie, l'autre colonne puis le nom départagent. */
export function rankBy<T extends { name: string; viewsTotal: number; views30d: number }>(rows: T[], sort: PageSort): T[] {
  const other: PageSort = sort === 'views30d' ? 'viewsTotal' : 'views30d';
  return [...rows].sort(
    (a, b) => b[sort] - a[sort] || b[other] - a[other] || a.name.localeCompare(b.name, 'fr'),
  );
}

/** « Toutes » garde les compteurs de la RPC ; une plateforme les remplace par les siens. Les visiteurs
 *  distincts ne sont comptés que toutes plateformes confondues (un appareil n'a qu'une plateforme). */
export function forPlatform<T extends { viewsTotal: number; views30d: number; visitors30d: number; byPlatform: ByPlatform }>(
  rows: T[],
  platform: Platform | 'all',
): T[] {
  if (platform === 'all') return rows;
  return rows.map((r) => {
    const v = r.byPlatform?.[platform] ?? { views30d: 0, viewsTotal: 0 };
    return { ...r, views30d: v.views30d, viewsTotal: v.viewsTotal, visitors30d: 0 };
  });
}
