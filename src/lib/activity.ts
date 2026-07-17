import { ActivityCategory, LocationCategory, isActivity } from '@/types/location';

export const DURATIONS = ['1h', '2-3h', 'Demi-journée', 'Journée'] as const;
export const WEATHERS = ['Soleil', 'Pluie', 'Tout temps'] as const;
export const EFFORTS = ['Tranquille', 'Modéré', 'Sportif'] as const;
export const PRICES = ['Gratuit', 'Payant'] as const;

export type Duration = typeof DURATIONS[number];
export type Weather = typeof WEATHERS[number];
export type Effort = typeof EFFORTS[number];
export type Price = typeof PRICES[number];

export { isActivity };
export type { ActivityCategory, LocationCategory };

// Contextual weather match: a location marked "Tout temps" matches every filter,
// and a filter of "Tout temps" matches everything.
export const matchesWeather = (locWeather: string | null | undefined, filter: string | null): boolean => {
  if (!filter) return true;
  if (!locWeather) return true;
  if (locWeather === 'Tout temps' || filter === 'Tout temps') return true;
  return locWeather === filter;
};

export const matchesDuration = (locDuration: string | null | undefined, filter: string | null): boolean => {
  if (!filter) return true;
  if (!locDuration) return true;
  return locDuration === filter;
};
