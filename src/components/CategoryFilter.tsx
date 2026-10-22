import { useTranslation } from 'react-i18next';
import {
  CategoryGroup,
  LocationCategory,
  PLACE_CATEGORIES,
  ACTIVITY_CATEGORIES,
} from '@/types/location';
import { motion } from 'framer-motion';
import { CATEGORY_ICONS } from '@/assets/icons';
import { translateToken } from '@/i18n/tokenMaps';

interface CategoryFilterProps {
  selected: LocationCategory | 'all';
  onChange: (cat: LocationCategory | 'all') => void;
  /** Groupe affiché, choisi au-dessus dans ses propres onglets. */
  group: CategoryGroup;
}

/** Contour et fond clair de chaque catégorie, mêmes valeurs que `LocationCategory.color` (iOS). */
const CATEGORY_TINT: Record<LocationCategory | 'all', { stroke: string; bg: string }> = {
  all:        { stroke: 'var(--secondary)', bg: 'var(--secondary-light)' },
  restaurant: { stroke: '#D95F3B', bg: '#FAF0EC' },
  cafe:       { stroke: '#3B7D6E', bg: '#EBF4F2' },
  shop:       { stroke: '#C49A35', bg: '#FEF9E7' },
  public:     { stroke: '#5A9A56', bg: '#EEF6EC' },
  coiffeur:   { stroke: '#9B59B6', bg: '#F3EAF7' },
  librairie:  { stroke: '#4A55A2', bg: '#ECEEF8' },
  nature:     { stroke: '#3E8E41', bg: '#E8F3E6' },
  sport:      { stroke: '#2F80B5', bg: '#E6F1FB' },
  creatif:    { stroke: '#7F5BB5', bg: '#F1EAF9' },
  culture:    { stroke: '#BA7517', bg: '#FAEEDA' },
  jeux:       { stroke: '#C64B7A', bg: '#FBEAF0' },
};

const CategoryIcon = ({ cat }: { cat: string }) => {
  const src = CATEGORY_ICONS[cat];
  if (!src) return null;
  return <img src={src} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />;
};

/** Active : fond clair et contour de la couleur de la catégorie, texte foncé — même grammaire que les pastilles de filtres. */
const Pill = ({
  cat, label, isActive, onClick,
}: { cat: LocationCategory | 'all'; label: string; isActive: boolean; onClick: () => void }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    aria-pressed={isActive}
    className="flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-all"
    style={{
      borderRadius: 999,
      minHeight: 36,
      padding: '0 13px',
      fontFamily: 'DM Sans',
      fontSize: 13,
      fontWeight: isActive ? 600 : 500,
      background: isActive ? CATEGORY_TINT[cat].bg : 'var(--surface)',
      color: isActive ? 'var(--text)' : 'var(--text-muted)',
      border: `${isActive ? 1.5 : 1}px solid ${isActive ? CATEGORY_TINT[cat].stroke : 'var(--border)'}`,
    }}
  >
    <CategoryIcon cat={cat} />
    {label}
  </motion.button>
);

/**
 * Rangée des catégories du groupe affiché (Lieux ou Activités), en tête
 * d'Explorer. Miroir de `CategoryFilterView` (iOS) et `category_filter.dart`.
 */
const CategoryFilter = ({ selected, onChange, group }: CategoryFilterProps) => {
  const { t } = useTranslation();
  const cats = group === 'places' ? PLACE_CATEGORIES : ACTIVITY_CATEGORIES;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide items-center" style={{ margin: '0 -16px', padding: '0 16px' }}>
      <Pill cat="all" label={t('filters.any')} isActive={selected === 'all'} onClick={() => onChange('all')} />
      {cats.map((cat) => (
        <Pill
          key={cat}
          cat={cat}
          label={translateToken('category_place', cat)}
          isActive={selected === cat}
          // Toucher la catégorie active la retire : on revient à « Tout ».
          onClick={() => onChange(selected === cat ? 'all' : cat)}
        />
      ))}
    </div>
  );
};

export default CategoryFilter;
