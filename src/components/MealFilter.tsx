import { motion } from 'framer-motion';
import { MealType } from '@/hooks/useMeals';
import { MEAL_ICONS } from '@/assets/icons';

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
      style={{ padding: '10px 16px 8px' }}
    >
      {mealTypes.map((m) => {
        const isActive = selected === m.id;
        const fill = m.fill_hex || 'var(--primary)';
        return (
          <motion.button
            key={m.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(isActive ? null : m.id)}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap transition-all"
            style={{
              flexShrink: 0,
              padding: '5px 18px',
              borderRadius: '100px',
              minHeight: 32,
              fontFamily: 'DM Sans',
              fontSize: '15px',
              lineHeight: '20px',
              fontWeight: 600,
              background: isActive ? fill : 'var(--surface)',
              color: isActive ? '#fff' : 'var(--text-muted)',
              border: isActive ? 'none' : '1px solid var(--border)',
              boxShadow: isActive ? `0 4px 12px ${fill}40` : 'none',
              cursor: 'pointer',
            }}
          >
            {MEAL_ICONS[m.id] ? (
              <img src={MEAL_ICONS[m.id]} alt="" style={{ width: 17, height: 17, objectFit: 'contain', flexShrink: 0 }} />
            ) : (
              <span style={{ fontSize: '15px', lineHeight: 1 }}>{m.emoji}</span>
            )}
            {m.short_label}
          </motion.button>
        );
      })}
    </div>
  );
};

export default MealFilter;
