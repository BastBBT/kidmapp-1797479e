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
        const isPast = !!w.past;

        // Base
        let border = '1.5px solid var(--border)';
        let background = 'var(--surface)';
        let color: string = 'var(--text)';

        if (isPast) {
          border = active
            ? '1.5px dashed var(--text-muted)'
            : '1.5px dashed var(--border)';
          background = active ? '#E7E3DC' : 'var(--surface)';
          color = active ? 'var(--text)' : 'var(--text-muted)';
        } else if (active) {
          border = '1.5px solid var(--primary)';
          background = 'var(--primary-light)';
          color = 'var(--primary)';
        }

        return (
          <button
            key={w.key}
            type="button"
            onClick={() => onChange(w.key)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 100,
              border,
              background,
              color,
              fontFamily: 'DM Sans',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isPast && <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>↩</span>}
            {w.label}
          </button>
        );
      })}
    </div>
  );
};

export default WeekendPicker;
