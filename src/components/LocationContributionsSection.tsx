import { useLocationContributions } from '@/hooks/useLocationContributions';
import { EQUIP_ICONS, EQUIP_SHORT_LABELS, EquipKey } from '@/assets/icons';
import { formatRelativeDateFr } from '@/lib/relativeDate';

const EQUIP_KEYS: EquipKey[] = ['high_chair', 'changing_table', 'kids_area', 'kids_menu'];

const Avatar = ({ name }: { name: string }) => {
  const initial = name.trim().charAt(0).toUpperCase() || '✦';
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'DM Sans', fontWeight: 600, fontSize: 14,
        color: 'var(--primary)',
      }}
    >
      {initial}
    </div>
  );
};

const EquipChip = ({ k, positive }: { k: EquipKey; positive: boolean }) => (
  <div
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 4px', borderRadius: 100,
      background: positive ? '#EBF6EC' : '#F2F2F2',
      border: positive ? 'none' : '1px solid var(--border)',
    }}
  >
    <span
      style={{
        width: 22, height: 22, borderRadius: 6,
        background: '#fff', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <img src={EQUIP_ICONS[k]} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
    </span>
    <span style={{ fontSize: 12, fontWeight: 600, color: positive ? '#2E7D32' : '#6B6B6B' }}>
      {EQUIP_SHORT_LABELS[k]} {positive ? '✓' : '✗'}
    </span>
  </div>
);

export default function LocationContributionsSection({ locationId }: { locationId: string }) {
  const { data } = useLocationContributions(locationId);
  if (!data || data.contributions.length === 0) return null;

  const items = data.contributions.slice(0, 3);

  return (
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          Ce que disent les familles
        </h2>
        {data.commentCount > 0 && (
          <span
            style={{
              fontSize: 12, fontWeight: 600,
              padding: '4px 10px', borderRadius: 100,
              background: 'rgba(217,95,59,0.12)', color: 'var(--primary)',
            }}
          >
            {data.commentCount} avis
          </span>
        )}
      </div>

      <div>
        {items.map((c) => {
          const fullName = c.profiles?.full_name?.trim() || '';
          const firstName = fullName ? fullName.split(/\s+/)[0] : 'Une famille';
          const chips = EQUIP_KEYS
            .filter((k) => c[k] === true || c[k] === false)
            .map((k) => ({ k, positive: c[k] === true }));

          return (
            <div
              key={c.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 14,
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: chips.length || c.content ? 10 : 0 }}>
                <Avatar name={firstName} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{firstName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatRelativeDateFr(c.created_at)}
                  </span>
                </div>
              </div>

              {chips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: c.content ? 10 : 0 }}>
                  {chips.map(({ k, positive }) => (
                    <EquipChip key={k} k={k} positive={positive} />
                  ))}
                </div>
              )}

              {c.content && c.content.trim().length > 0 && (
                <div
                  style={{
                    fontFamily: 'Caveat',
                    fontStyle: 'italic',
                    fontSize: 16,
                    lineHeight: 1.4,
                    color: 'var(--text)',
                  }}
                >
                  « {c.content.trim()} »
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
