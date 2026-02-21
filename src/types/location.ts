import { Tables } from '@/integrations/supabase/types';

export type LocationCategory = 'restaurant' | 'cafe' | 'shop' | 'public';

export type Location = Tables<'locations'> & {
  // Type narrowing helpers
};

export type Contribution = Tables<'contributions'>;

export const categoryLabels: Record<LocationCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  shop: 'Boutique',
  public: 'Lieu public',
};

export const categoryIcons: Record<LocationCategory, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  shop: '🛍️',
  public: '🌳',
};
