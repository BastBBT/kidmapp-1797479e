import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OpenNowPillProps {
  active: boolean;
  onToggle: () => void;
}

/**
 * Chip bascule « Ouvert » d'Explorer : ne garde que les lieux qui ne sont pas fermés à cet
 * instant (heure de Paris). Miroir de `OpenNowChip` (iOS) / `OpenChip` (Android). Le filtre est
 * permissif : un lieu sans horaires reste affiché.
 */
const OpenNowPill = ({ active, onToggle }: OpenNowPillProps) => {
  const { t } = useTranslation();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      aria-pressed={active}
      aria-label={t('assistant.open_now_title')}
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
      {active ? <Check size={12} aria-hidden /> : <Clock size={12} aria-hidden />}
      {t('filters.open')}
    </motion.button>
  );
};

export default OpenNowPill;
