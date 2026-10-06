import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CounterRowPill from '@/components/CounterRowPill';

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
    <CounterRowPill
      active={active}
      onToggle={onToggle}
      icon={<Clock size={12} aria-hidden />}
      label={t('filters.open')}
      ariaLabel={t('assistant.open_now_title')}
    />
  );
};

export default OpenNowPill;
