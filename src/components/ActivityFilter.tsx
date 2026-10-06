import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { WEATHERS, DURATIONS } from '@/lib/activity';
import { translateToken } from '@/i18n/tokenMaps';

interface ActivityFilterProps {
  weather: string | null;
  duration: string | null;
  onWeatherChange: (v: string | null) => void;
  onDurationChange: (v: string | null) => void;
}

const WEATHER_ICONS: Record<string, string> = {
  Soleil: '☀️',
  Pluie: '🌧️',
  'Tout temps': '🌤️',
};

const Pill = ({
  label, icon, active, onClick,
}: { label: string; icon?: string; active: boolean; onClick: () => void }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', borderRadius: 100,
      minHeight: 32,
      border: active ? 'none' : '1px solid var(--border)',
      background: active ? 'var(--primary)' : 'var(--surface)',
      color: active ? '#fff' : 'var(--text-muted)',
      fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
      cursor: 'pointer', whiteSpace: 'nowrap',
    }}
  >
    {icon && <span>{icon}</span>}
    {label}
  </motion.button>
);

const ActivityFilter = ({ weather, duration, onWeatherChange, onDurationChange }: ActivityFilterProps) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 16px 4px' }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="scrollbar-hide">
        <span style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center', flexShrink: 0, marginRight: 2 }}>{t('filters.weather_label')}</span>
        {WEATHERS.map((w) => (
          <Pill
            key={w}
            label={translateToken('weather', w)}
            icon={WEATHER_ICONS[w]}
            active={weather === w}
            onClick={() => onWeatherChange(weather === w ? null : w)}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="scrollbar-hide">
        <span style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center', flexShrink: 0, marginRight: 2 }}>{t('filters.duration_label')}</span>
        {DURATIONS.map((d) => (
          <Pill
            key={d}
            label={translateToken('duration', d)}
            active={duration === d}
            onClick={() => onDurationChange(duration === d ? null : d)}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivityFilter;
