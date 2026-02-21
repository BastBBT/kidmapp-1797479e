export type LocationCategory = 'restaurant' | 'cafe' | 'shop' | 'public';

export interface Location {
  id: string;
  name: string;
  category: LocationCategory;
  city: string;
  lat: number;
  lng: number;
  photo: string;
  highChair: boolean;
  changingTable: boolean;
  kidsArea: boolean;
  status: 'published' | 'unpublished' | 'pending';
  address?: string;
}

export interface Contribution {
  id: string;
  locationId: string;
  highChair: boolean | null;
  changingTable: boolean | null;
  kidsArea: boolean | null;
  timestamp: string;
  status: 'pending' | 'validated' | 'rejected';
}

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
