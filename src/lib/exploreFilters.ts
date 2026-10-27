import { CategoryGroup, LocationCategory, isActivity } from '@/types/location';
import { ChildAgeBucket, matchesAgeBuckets } from '@/lib/ageFilter';
import { matchesDuration, matchesWeather } from '@/lib/activity';
import { matchesOpenNow } from '@/lib/openingHours';

/**
 * Un jeu de filtres d'Explorer, copiable : la page, le panneau Filtres et l'état
 * « rien pour ces filtres » comptent tous à partir de lui. Miroir d'`ExploreCriteria`
 * (LocationsViewModel.swift) et de `locations_service.dart`.
 */
export interface ExploreCriteria {
  group: CategoryGroup;
  category: LocationCategory | 'all';
  ageBuckets: Set<ChildAgeBucket>;
  onlyOpen: boolean;
  onlyNearby: boolean;
  /** Côté lieux seulement. */
  mealId: string | null;
  /** Côté activités seulement. */
  onlyFree: boolean;
  weather: string | null;
  duration: string | null;
}

export interface ExploreLoc {
  id: string;
  category: string;
  lat: number;
  lng: number;
  city?: string | null;
  address?: string | null;
  age_min_months?: number | null;
  age_max_months?: number | null;
  opening_hours?: unknown;
  business_status?: string | null;
  is_free?: boolean | null;
  weather?: string | null;
  duration?: string | null;
}

export interface ExploreContext {
  now: Date;
  /** Lieux du repas choisi, d'après `location_meals`. */
  mealLocationIds: (mealId: string) => Set<string>;
  isNear: (loc: ExploreLoc) => boolean;
}

/** Les mêmes filtres dans l'autre groupe : ce qui n'a de sens que dans un groupe est effacé. */
export const inGroup = (c: ExploreCriteria, group: CategoryGroup): ExploreCriteria => ({
  ...c,
  group,
  category: 'all',
  mealId: null,
  onlyFree: false,
  weather: null,
  duration: null,
});

export const matchesExplore = (loc: ExploreLoc, c: ExploreCriteria, ctx: ExploreContext): boolean => {
  // Sans catégorie précise, « Tout » reste borné au groupe actif : on n'affiche
  // jamais la liste mélangée.
  if (c.category !== 'all') {
    if (loc.category !== c.category) return false;
  } else if (isActivity(loc.category) !== (c.group === 'activities')) {
    return false;
  }
  // Plusieurs tranches (« Les deux ») = union, pas intersection.
  if (!matchesAgeBuckets(loc, c.ageBuckets)) return false;
  if (!matchesOpenNow(loc.opening_hours, c.onlyOpen, ctx.now, loc.business_status)) return false;
  if (c.onlyNearby && !ctx.isNear(loc)) return false;
  if (c.group === 'places') {
    if (c.mealId && !ctx.mealLocationIds(c.mealId).has(loc.id)) return false;
  } else {
    // « Gratuit » strict : seul is_free === true passe, contrairement à météo et
    // durée où une donnée absente ne cache jamais l'activité.
    if (c.onlyFree && loc.is_free !== true) return false;
    if (!matchesWeather(loc.weather, c.weather)) return false;
    if (!matchesDuration(loc.duration, c.duration)) return false;
  }
  return true;
};

export const countExplore = (locs: ExploreLoc[], c: ExploreCriteria, ctx: ExploreContext): number =>
  locs.reduce((n, loc) => n + (matchesExplore(loc, c, ctx) ? 1 : 0), 0);

/** Jetons de la base ; « À l'abri » garde aussi ce qui se fait par tous les temps (`matchesWeather`). */
export const WEATHER_OPTIONS = ['Soleil', 'Pluie'] as const;
export const weatherLabelKey = (w: string) => (w === 'Pluie' ? 'explore.weather_indoor' : 'explore.weather_outdoor');
