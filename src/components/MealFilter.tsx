import { motion } from 'framer-motion';
import { MealType } from '@/hooks/useMeals';

interface MealFilterProps {
  mealTypes: MealType[];
  selected: string | null;
  onChange: (id: string | null) => void;
}

const MealFilter = ({ mealTypes, selected, onChange }: MealFilterProps) => {
  if (!mealTypes.length) return null;
  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide"
      style={{ padding: '0 16px 8px' }}
    >
      {mealTypes.map((m) => {
        const isActive = selected === m.id;
        const fill = m.fill_hex || 'var(--primary)';
        return (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(isActive ? null : m.id)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-all"
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              borderRadius: '100px',
              fontFamily: 'DM Sans',
              fontSize: '13px',
              fontWeight: 600,
              background: isActive ? fill : 'var(--surface)',
              color: isActive ? '#fff' : 'var(--text-muted)',
              border: isActive ? 'none' : '1px solid var(--border)',
              boxShadow: isActive ? `0 4px 12px ${fill}40` : 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '15px', lineHeight: 1 }}>{m.emoji}</span>
            {m.short_label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default MealFilter;
