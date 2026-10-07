import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NearbyFilterPillProps {
  active: boolean;
  onToggle: () => void;
}

/**
 * Chip bascule « Proche de moi » partagé par Explorer et Sorties : écarte ce qui est hors
 * de la zone du profil. Même forme que `FreeFilterPill`. Miroir de `NearbyFilterChip` (iOS).
 */
const NearbyFilterPill = ({ active, onToggle }: NearbyFilterPillProps) => {
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
      <Navigation size={14} aria-hidden />
      {t('filters.nearby')}
    </motion.button>
  );
};

export default NearbyFilterPill;
