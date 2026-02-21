import { LocationCategory, categoryIcons, categoryLabels } from '@/types/location';
import { motion } from 'framer-motion';

interface CategoryFilterProps {
  selected: LocationCategory | 'all';
  onChange: (cat: LocationCategory | 'all') => void;
}

const categories: (LocationCategory | 'all')[] = ['all', 'restaurant', 'cafe', 'shop', 'public'];

const allLabels: Record<string, string> = {
  all: 'Tout',
  ...categoryLabels,
};

const allIcons: Record<string, string> = {
  all: '📍',
  ...categoryIcons,
};

const CategoryFilter = ({ selected, onChange }: CategoryFilterProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <motion.button
          key={cat}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(cat)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            selected === cat
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground kid-shadow hover:bg-muted'
          }`}
        >
          <span>{allIcons[cat]}</span>
          {allLabels[cat]}
        </motion.button>
      ))}
    </div>
  );
};

export default CategoryFilter;
