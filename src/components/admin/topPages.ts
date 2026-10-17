import { isActivity } from '@/types/location';

/** Forme renvoyée par la RPC `admin_top_pages` (supabase/migrations/20261017120000). */
export type TopLocation = {
  id: string;
  name: string;
  category: string;
  city: string;
  viewsTotal: number;
  views30d: number;
  visitors30d: number;
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
