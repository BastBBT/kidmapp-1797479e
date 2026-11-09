import { Tables } from '@/integrations/supabase/types';

/** Lieux = commerces et services payants. */
export type PlaceCategory = 'restaurant' | 'cafe' | 'shop' | 'coiffeur' | 'librairie' | 'manege';
/** Activités = tout ce qu'on va faire (y compris le public/gratuit). `jeux` s'affiche « Parc à thème ». */
export type ActivityCategory = 'nature' | 'sport' | 'creatif' | 'culture' | 'jeux' | 'laep' | 'aire_de_jeux';
/** Jeton historique : plus proposé nulle part (les lieux publics sont devenus `aire_de_jeux`),
 *  mais encore accepté en base (CHECK) et donc toujours affichable sans crash. */
export type LegacyCategory = 'public';
export type LocationCategory = PlaceCategory | ActivityCategory | LegacyCategory;

export const PLACE_CATEGORIES: PlaceCategory[] = ['restaurant', 'cafe', 'shop', 'coiffeur', 'librairie', 'manege'];
export const ACTIVITY_CATEGORIES: ActivityCategory[] = ['nature', 'sport', 'creatif', 'culture', 'jeux', 'laep', 'aire_de_jeux'];

export const isActivity = (cat?: string | null): cat is ActivityCategory =>
  !!cat && (ACTIVITY_CATEGORIES as string[]).includes(cat);

/** Groupe de navigation haut-niveau : on ne mélange jamais lieux et activités. */
export type CategoryGroup = 'places' | 'activities';

export const groupOf = (cat: LocationCategory | 'all'): CategoryGroup =>
  isActivity(cat) ? 'activities' : 'places';

export type Location = Tables<'locations'> & {
  // Type narrowing helpers

  // Colonnes ajoutées par la migration `photos` / `reel_url`. Déclarées ici en
  // optionnel pour que le code compile avant la régénération de `types.ts` par
  // Lovable ; une fois celle-ci faite, elles deviennent redondantes (mêmes types)
  // et ces deux lignes peuvent disparaître.
  photos?: string[] | null;
  reel_url?: string | null;
};

export type Contribution = Tables<'contributions'>;

export const categoryLabels: Record<LocationCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  shop: 'Boutique',
  public: 'Lieu public',
  coiffeur: 'Coiffeur',
  librairie: 'Librairie',
  nature: 'Nature',
  sport: 'Sport',
  creatif: 'Créatif',
  culture: 'Culture',
  jeux: 'Parc à thème',
  laep: 'LAEP',
  aire_de_jeux: 'Aire de jeux',
  manege: 'Manège',
};

export const categoryIcons: Record<LocationCategory, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  shop: '🛍️',
  public: '🌳',
  coiffeur: '✂️',
  librairie: '📚',
  nature: '🌿',
  sport: '⚽',
  creatif: '🎨',
  culture: '🏛️',
  jeux: '🎲',
  laep: '🧸',
  aire_de_jeux: '🛝',
  manege: '🎠',
};
