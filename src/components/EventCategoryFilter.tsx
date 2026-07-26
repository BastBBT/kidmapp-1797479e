import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { eventCategoryHex, eventCategoryEmoji } from '@/types/event';
import { translateToken } from '@/i18n/tokenMaps';

interface Props {
  available: string[];
  selected: string | 'all';
  onChange: (v: string | 'all') => void;
}

const KNOWN_ORDER = ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Marché', 'Exposition'];

export const orderEventCategories = (cats: string[]): string[] => {
  const set = new Set(cats);
  const known = KNOWN_ORDER.filter((c) => set.has(c));
  const hasAutre = set.has('Autre');
  const unknown = cats
    .filter((c) => !KNOWN_ORDER.includes(c) && c !== 'Autre')
    .sort((a, b) => a.localeCompare(b, 'fr'));
  return [...known, ...unknown, ...(hasAutre ? ['Autre'] : [])];
};

const Pill = ({
  label,
  isActive,
  activeColor,
  onClick,
}: {
  label: string;
  isActive: boolean;
  activeColor?: string;
  onClick: () => void;
}) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex shrink-0 items-center gap-1.5 px-3 py-0.5 text-[14px] font-medium leading-4 whitespace-nowrap transition-all"
    style={{
      borderRadius: 100,
      minHeight: 28,
      background: isActive ? (activeColor ?? 'var(--primary)') : 'var(--bg)',
      color: isActive ? '#fff' : 'var(--text-muted)',
      border: isActive ? 'none' : '1px solid var(--border)',
    }}
  >
    {label}
  </motion.button>
);

const EventCategoryFilter = ({ available, selected, onChange }: Props) => {
  const { t } = useTranslation();
  if (available.length < 2) return null;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
      <Pill label={t('filters.all')} isActive={selected === 'all'} onClick={() => onChange('all')} />
      {available.map((cat) => {
        const active = selected === cat;
        return (
          <Pill
            key={cat}
            label={`${eventCategoryEmoji(cat)} ${translateToken('category_event', cat)}`}
            isActive={active}
            activeColor={eventCategoryHex(cat)}
            onClick={() => onChange(active ? 'all' : cat)}
          />
        );
      })}
    </div>
  );
};

export default EventCategoryFilter;
