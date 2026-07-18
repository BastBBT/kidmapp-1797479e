import { LocationCategory, categoryLabels, PLACE_CATEGORIES, ACTIVITY_CATEGORIES } from '@/types/location';
import { motion } from 'framer-motion';
import { CATEGORY_ICONS } from '@/assets/icons';

interface CategoryFilterProps {
  selected: LocationCategory | 'all';
  onChange: (cat: LocationCategory | 'all') => void;
}

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

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      fontFamily: 'Caveat, cursive',
      fontSize: 13,
      color: 'var(--text-muted)',
      flexShrink: 0,
      alignSelf: 'center',
      marginRight: 2,
    }}
  >
    {children}
  </span>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
    {children}
  </div>
);

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="flex flex-col gap-1.5">
      <Row>
        <Pill cat="all" label="Tout" isActive={selected === 'all'} onClick={() => onChange('all')} />
        <span style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />
        <GroupLabel>Lieux</GroupLabel>
        {PLACE_CATEGORIES.map((cat) => (
          <Pill
            key={cat}
            cat={cat}
            label={categoryLabels[cat]}
            isActive={selected === cat}
            onClick={() => onChange(cat)}
          />
        ))}
      </Row>
      <Row>
        <GroupLabel>Activités</GroupLabel>
        {ACTIVITY_CATEGORIES.map((cat) => (
          <Pill
            key={cat}
            cat={cat}
            label={categoryLabels[cat]}
            isActive={selected === cat}
            onClick={() => onChange(cat)}
          />
        ))}
      </Row>
    </div>
  );
};

export default CategoryFilter;
