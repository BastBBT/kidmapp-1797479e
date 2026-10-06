import { motion } from 'framer-motion';
import { Check, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FreeFilterPillProps {
  active: boolean;
  onToggle: () => void;
  /** Version de la ligne du compteur d'Explorer : même gabarit que `OpenNowPill`, neutre au repos. */
  compact?: boolean;
}

/**
 * Chip bascule « Gratuit » partagé par Explorer (activités) et Sorties.
 * Miroir de `freeChip` / `freePill` côté iOS. Le filtre lui-même est strict :
 * seul `is_free === true` passe, un prix inconnu n'est pas présenté gratuit.
 */
const FreeFilterPill = ({ active, onToggle, compact = false }: FreeFilterPillProps) => {
  const { t } = useTranslation();
  if (compact) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        aria-pressed={active}
        className="shrink-0"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 12px', borderRadius: 100,
          border: active ? 'none' : '1px solid var(--border)',
          background: active ? 'var(--secondary)' : 'var(--surface)',
          color: active ? '#fff' : 'var(--text-muted)',
          fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {active ? <Check size={12} aria-hidden /> : <Gift size={12} aria-hidden />}
        {t('filters.free')}
      </motion.button>
    );
  }
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
