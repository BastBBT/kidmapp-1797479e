import { LocationCategory, categoryLabels } from '@/types/location';
import { motion } from 'framer-motion';
import { CATEGORY_ICONS } from '@/assets/icons';

interface CategoryFilterProps {
  selected: LocationCategory | 'all';
  onChange: (cat: LocationCategory | 'all') => void;
}

const categories: (LocationCategory | 'all')[] = ['all', 'restaurant', 'cafe', 'shop', 'public', 'coiffeur'];

const allLabels: Record<string, string> = {
  all: 'Tout',
  ...categoryLabels,
};

const CategoryIcon = ({ cat }: { cat: string }) => {
  const src = CATEGORY_ICONS[cat];
  if (!src) return null;
  return <img src={src} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />;
};

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => {
        const isActive = selected === cat;
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(cat)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all"
            style={{
              borderRadius: '100px',
              background: isActive ? 'var(--primary)' : 'var(--bg)',
              color: isActive ? '#fff' : 'var(--text-muted)',
              border: isActive ? 'none' : '1px solid var(--border)',
            }}
          >
            <CategoryIcon cat={cat} />
            {allLabels[cat]}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
