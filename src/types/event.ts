export const EVENT_CATEGORIES = ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Marché', 'Exposition', 'Autre'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

export const EVENT_WEATHERS = ['En intérieur', 'En extérieur', 'Les deux'] as const;
export type EventWeather = typeof EVENT_WEATHERS[number];

export interface EventItem {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  date_start: string;
  date_end: string | null;
  time: string | null;
  age_min: number | null;
  age_max: number | null;
  duration: string | null;
  weather: string | null;
  price: string | null;
  website: string | null;
  instagram: string | null;
  photo: string | null;
  note: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_TOKENS: Record<string, string> = {
  Spectacle: 'var(--event-spectacle)',
  Atelier: 'var(--event-atelier)',
  Festival: 'var(--event-festival)',
  'Fête': 'var(--event-fete)',
  Fete: 'var(--event-fete)',
  Marché: 'var(--event-marche)',
  Marche: 'var(--event-marche)',
  Exposition: 'var(--event-exposition)',
  Autre: 'var(--event-autre)',
};

export const eventCategoryColor = (category?: string | null): string =>
  (category && CATEGORY_TOKENS[category]) || 'var(--event-autre)';

const CATEGORY_HEX: Record<string, string> = {
  Spectacle: '#EF9F27',
  Atelier: '#7F5BB5',
  Festival: '#C64B7A',
  'Fête': '#D95F3B',
  Fete: '#D95F3B',
  Marché: '#3B7D6E',
  Marche: '#3B7D6E',
  Autre: '#EF9F27',
};

export const eventCategoryHex = (category?: string | null): string =>
  (category && CATEGORY_HEX[category]) || '#EF9F27';

const CATEGORY_EMOJI: Record<string, string> = {
  Spectacle: '🎭',
  Atelier: '🎨',
  Festival: '🎉',
  'Fête': '🎊',
  Fete: '🎊',
  Marché: '🛍️',
  Marche: '🛍️',
  Autre: '✨',
};

export const eventCategoryEmoji = (category?: string | null): string =>
  (category && CATEGORY_EMOJI[category]) || '✨';
