import { LocationCategory, categoryLabels } from '@/types/location';
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

// SVG icons inline — no emojis
const CategoryIcon = ({ cat }: { cat: string }) => {
  switch (cat) {
    case 'all':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case 'restaurant':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 6c0 0-1 4 1.5 6.5V19a1 1 0 002 0v-6.5C13 10 12 6 12 6" />
          <path d="M9.5 6v4" />
          <path d="M16 6v5.5c0 1.5-1 2-2 2v6.5a1 1 0 002 0" />
        </svg>
      );
    case 'cafe':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 10h11v5.5a4.5 4.5 0 01-4.5 4.5h-2A4.5 4.5 0 015 15.5V10z" />
          <path d="M16 11.5h1.5a2 2 0 010 4H16" />
        </svg>
      );
    case 'shop':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 11v9h14v-9" />
          <path d="M3.5 7l2 4h13l2-4H3.5z" />
          <rect x="9.5" y="15" width="5" height="5" rx="0.5" />
        </svg>
      );
    case 'public':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4c-2 3-6 4.5-6 10a6 6 0 0012 0c0-5.5-4-7-6-10z" />
          <path d="M12 20V11" />
        </svg>
      );
    default:
      return null;
  }
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
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-all"
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
