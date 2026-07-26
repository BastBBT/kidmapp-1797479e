import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AGE_BUCKETS, AgeBucket } from '@/lib/ageFilter';

interface AgeFilterProps {
  selected: AgeBucket;
  onChange: (b: AgeBucket) => void;
}

const AGE_KEY: Record<AgeBucket, string> = {
  all: 'filters.age.all',
  '0-2': 'filters.age.0_2',
  '3-5': 'filters.age.3_5',
  '6+': 'filters.age.6_plus',
};

const AgeFilter = ({ selected, onChange }: AgeFilterProps) => {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {t('filters.age_label')}
      </span>
      <div
        style={{ display: 'inline-flex', gap: 6 }}
        className="scrollbar-hide"
      >
        {AGE_BUCKETS.map((b) => {
          const active = selected === b.id;
          return (
          <motion.button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            whileTap={{ scale: 0.95 }}
            style={{
              flexShrink: 0,
              padding: '4px 10px',
              borderRadius: 100,
              border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              background: active ? 'var(--primary-light)' : 'var(--surface)',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              fontFamily: 'DM Sans',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all .15s',
            }}
          >
            {t(AGE_KEY[b.id])}
          </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default AgeFilter;
