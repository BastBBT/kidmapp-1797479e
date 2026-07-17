import { Weekend } from '@/lib/weekend';

interface Props {
  weekends: Weekend[];
  selectedKey: string;
  onChange: (key: string) => void;
}

const WeekendPicker = ({ weekends, selectedKey, onChange }: Props) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '8px 16px 4px',
      }}
      className="scrollbar-hide"
    >
      {weekends.map((w) => {
        const active = w.key === selectedKey;
        return (
          <button
            key={w.key}
            type="button"
            onClick={() => onChange(w.key)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 100,
              border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: active ? 'var(--primary-light)' : 'var(--surface)',
              color: active ? 'var(--primary)' : 'var(--text)',
              fontFamily: 'DM Sans',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {w.label}
          </button>
        );
      })}
    </div>
  );
};

export default WeekendPicker;
