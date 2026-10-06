import { motion } from 'framer-motion';
import { Check, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FreeFilterPillProps {
  active: boolean;
  onToggle: () => void;
}

/**
 * Bascule « Gratuit » partagée par Explorer (groupe Activités) et Sorties.
 * Inactif : neutre comme les autres chips. Actif : plein vert avec une coche — l'état
 * ne doit jamais pouvoir se confondre avec « inactif ». Miroir de `FreeFilterChip` (iOS).
 * Le filtre lui-même est strict : seul `is_free === true` passe.
 */
const FreeFilterPill = ({ active, onToggle }: FreeFilterPillProps) => {
  const { t } = useTranslation();
  const Icon = active ? Check : Gift;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      aria-pressed={active}
      style={{
        flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 100,
        minHeight: 32,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--secondary)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-muted)',
        fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      <Icon size={13} strokeWidth={2.5} aria-hidden />
      {t('filters.free')}
    </motion.button>
  );
};

export default FreeFilterPill;
