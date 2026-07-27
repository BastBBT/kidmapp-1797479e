import { Tables } from '@/integrations/supabase/types';

export type PlaceCategory = 'restaurant' | 'cafe' | 'shop' | 'public' | 'coiffeur';
export type ActivityCategory = 'nature' | 'sport' | 'creatif' | 'culture' | 'jeux';
export type LocationCategory = PlaceCategory | ActivityCategory;

export const PLACE_CATEGORIES: PlaceCategory[] = ['restaurant', 'cafe', 'shop', 'public', 'coiffeur'];
export const ACTIVITY_CATEGORIES: ActivityCategory[] = ['nature', 'sport', 'creatif', 'culture', 'jeux'];

export const isActivity = (cat?: string | null): cat is ActivityCategory =>
  !!cat && (ACTIVITY_CATEGORIES as string[]).includes(cat);

/** Groupe de navigation haut-niveau : on ne mélange jamais lieux et activités. */
export type CategoryGroup = 'places' | 'activities';

export const groupOf = (cat: LocationCategory | 'all'): CategoryGroup =>
  isActivity(cat) ? 'activities' : 'places';

export type Location = Tables<'locations'> & {
  // Type narrowing helpers
};

export type Contribution = Tables<'contributions'>;

export const categoryLabels: Record<LocationCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  shop: 'Boutique',
  public: 'Lieu public',
  coiffeur: 'Coiffeur',
  nature: 'Nature',
  sport: 'Sport',
  creatif: 'Créatif',
  culture: 'Culture',
  jeux: 'Jeux',
};

export const categoryIcons: Record<LocationCategory, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  shop: '🛍️',
  public: '🌳',
  coiffeur: '✂️',
  nature: '🌿',
  sport: '⚽',
  creatif: '🎨',
  culture: '🏛️',
  jeux: '🎲',
};
