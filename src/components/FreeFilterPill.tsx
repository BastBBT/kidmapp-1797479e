import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FreeFilterPillProps {
  active: boolean;
  onToggle: () => void;
}

/**
 * Chip bascule « Gratuit » partagé par Explorer (activités) et Sorties.
 * Miroir de `freeChip` / `freePill` côté iOS. Le filtre lui-même est strict :
 * seul `is_free === true` passe, un prix inconnu n'est pas présenté gratuit.
 */
const FreeFilterPill = ({ active, onToggle }: FreeFilterPillProps) => {
  const { t } = useTranslation();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      aria-pressed={active}
      style={{
        flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 14px', borderRadius: 100,
        minHeight: 32,
        border: active ? 'none' : '1px solid var(--secondary)',
        background: active ? 'var(--secondary)' : 'var(--secondary-light)',
        color: active ? '#fff' : 'var(--secondary)',
        fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      <Gift size={14} aria-hidden />
      {t('filters.free')}
    </motion.button>
  );
};

export default FreeFilterPill;
