import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationCategory, PLACE_CATEGORIES, ACTIVITY_CATEGORIES } from '@/types/location';
import { motion } from 'framer-motion';
import { CATEGORY_ICONS } from '@/assets/icons';
import { translateToken } from '@/i18n/tokenMaps';

interface CategoryFilterProps {
  selected: LocationCategory | 'all';
  onChange: (cat: LocationCategory | 'all') => void;
}

type Group = 'places' | 'activities';

const CategoryIcon = ({ cat }: { cat: string }) => {
  const src = CATEGORY_ICONS[cat];
  if (!src) return null;
  return <img src={src} alt="" style={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0 }} />;
};

const Pill = ({
  cat, label, isActive, onClick,
}: { cat: string; label: string; isActive: boolean; onClick: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex shrink-0 items-center gap-1.5 px-3 py-0.5 text-[14px] font-medium leading-4 whitespace-nowrap transition-all"
    style={{
      borderRadius: '100px',
      minHeight: 28,
      background: isActive ? 'var(--primary)' : 'var(--bg)',
      color: isActive ? '#fff' : 'var(--text-muted)',
      border: isActive ? 'none' : '1px solid var(--border)',
    }}
  >
    <CategoryIcon cat={cat} />
    {label}
  </motion.button>
);

const groupOf = (cat: LocationCategory | 'all'): Group =>
  (ACTIVITY_CATEGORIES as readonly string[]).includes(cat as string) ? 'activities' : 'places';

const SegmentedControl = ({
  group,
  onChange,
  otherHasFilter,
}: {
  group: Group;
  onChange: (g: Group) => void;
  otherHasFilter: { places: boolean; activities: boolean };
}) => {
  const { t } = useTranslation();
  const segStyle = (active: boolean): React.CSSProperties => ({
    position: 'relative',
    padding: '5px 12px',
    borderRadius: 100,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    color: active ? 'var(--text)' : 'var(--text-muted)',
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all .15s',
    whiteSpace: 'nowrap',
  });

  const Dot = () => (
    <span
      style={{
        position: 'absolute',
        top: 2,
        right: 4,
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--primary)',
      }}
    />
  );

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: '#E7E3DC',
        borderRadius: 100,
        flexShrink: 0,
        alignSelf: 'center',
      }}
    >
      <button type="button" onClick={() => onChange('places')} style={segStyle(group === 'places')}>
        {t('filters.places')}
        {group !== 'places' && otherHasFilter.places && <Dot />}
      </button>
      <button type="button" onClick={() => onChange('activities')} style={segStyle(group === 'activities')}>
        {t('filters.activities')}
        {group !== 'activities' && otherHasFilter.activities && <Dot />}
      </button>
    </div>
  );
};

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  const { t } = useTranslation();
  const [group, setGroup] = useState<Group>(() =>
    selected === 'all' ? 'places' : groupOf(selected)
  );

  useEffect(() => {
    if (selected !== 'all') {
      const g = groupOf(selected);
      if (g !== group) setGroup(g);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const activeCats = group === 'places' ? PLACE_CATEGORIES : ACTIVITY_CATEGORIES;

  const selectedInPlaces =
    selected !== 'all' && (PLACE_CATEGORIES as readonly string[]).includes(selected as string);
  const selectedInActivities =
    selected !== 'all' && (ACTIVITY_CATEGORIES as readonly string[]).includes(selected as string);

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl
        group={group}
        onChange={setGroup}
        otherHasFilter={{ places: selectedInPlaces, activities: selectedInActivities }}
      />
      <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center min-w-0 flex-1">
        <Pill cat="all" label={t('filters.any')} isActive={selected === 'all'} onClick={() => onChange('all')} />
        {activeCats.map((cat) => (
          <Pill
            key={cat}
            cat={cat}
            label={translateToken('category_place', cat)}
            isActive={selected === cat}
            onClick={() => onChange(cat)}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
