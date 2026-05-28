import { LocationCategory, categoryLabels } from '@/types/location';
import { CATEGORY_ICONS } from '@/assets/icons';
import { X } from 'lucide-react';

interface Props {
  category: LocationCategory | 'all';
  onClear: () => void;
}

const categoryColors: Record<LocationCategory, { bg: string; border: string; text: string }> = {
  restaurant: { bg: '#FBE6DA', border: '#D9805E', text: '#7A3A24' },
  cafe:       { bg: '#DCEFEB', border: '#5FA89D', text: '#2E5C55' },
  public:     { bg: '#E2F0D6', border: '#72B05E', text: '#3B5E2C' },
  shop:       { bg: '#FBF1D1', border: '#E0B848', text: '#6B5418' },
  coiffeur:   { bg: '#EEDFF4', border: '#9B59B6', text: '#5C2E73' },
};

const ActiveCategoryBanner = ({ category, onClear }: Props) => {
  const isActive = category && category !== 'all';
  const colors = isActive ? categoryColors[category as LocationCategory] : null;

  return (
    <div
      style={{
        overflow: 'hidden',
        maxHeight: isActive ? 60 : 0,
        opacity: isActive ? 1 : 0,
        transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
      }}
    >
      {isActive && colors && (
        <div style={{ padding: '8px 16px 4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '6px 10px 6px 12px',
              borderRadius: 100,
              background: colors.bg,
              border: `1.5px solid ${colors.border}`,
              color: colors.text,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {CATEGORY_ICONS[category] && (
                <img
                  src={CATEGORY_ICONS[category]}
                  alt=""
                  style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
                />
              )}
              <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600 }}>
                Filtre actif&nbsp;: {categoryLabels[category as LocationCategory]}
              </span>
            </div>
            <button
              onClick={onClear}
              aria-label="Retirer le filtre"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
                border: 'none', cursor: 'pointer', color: colors.text,
                flexShrink: 0,
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveCategoryBanner;
