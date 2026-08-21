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

// Correspondance météo : « Tout temps » est un joker ASYMÉTRIQUE, et c'est voulu.
// Un lieu couvert doit ressortir quand le parent cherche quoi faire un jour de pluie —
// sans ça le chip « Pluie » ne renvoie jamais rien, aucune activité n'étant taguée
// « Pluie » en base (les lieux fermés sont tous en « Tout temps »). L'inverse serait
// faux : demander « Soleil », c'est vouloir sortir dehors, pas récupérer les 49 lieux
// couverts. Le joker symétrique précédent faisait renvoyer les 100 activités aux chips
// « Soleil » et « Tout temps », qui ne filtraient donc plus rien.
// Une donnée absente ne cache jamais l'activité.
export const matchesWeather = (locWeather: string | null | undefined, filter: string | null): boolean => {
  if (!filter) return true;
  if (!locWeather) return true;
  if (locWeather === filter) return true;
  return filter === 'Pluie' && locWeather === 'Tout temps';
};

export const matchesDuration = (locDuration: string | null | undefined, filter: string | null): boolean => {
  if (!filter) return true;
  if (!locDuration) return true;
  return locDuration === filter;
};
