import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

interface CounterRowPillProps {
  active: boolean;
  onToggle: () => void;
  /** Icône de repos (12 px) ; remplacée par une coche quand la pastille est active. */
  icon: ReactNode;
  label: string;
  ariaLabel?: string;
}

/**
 * Gabarit des bascules de la ligne du compteur d'Explorer (« Gratuit », « Ouvert ») :
 * neutre au repos, vert plein avec une coche quand actif. Miroir de `FreeFilterChip` /
 * `OpenNowChip` (iOS) — l'état actif ne doit jamais pouvoir se confondre avec « inactif ».
 */
const CounterRowPill = ({ active, onToggle, icon, label, ariaLabel }: CounterRowPillProps) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.95 }}
    onClick={onToggle}
    aria-pressed={active}
    aria-label={ariaLabel}
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
    {active ? <Check size={12} aria-hidden /> : icon}
    {label}
  </motion.button>
);

export default CounterRowPill;
