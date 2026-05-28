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
        maxHeight: isActive ? 40 : 0,
        opacity: isActive ? 1 : 0,
        transition: 'max-height 200ms ease-in-out, opacity 200ms ease-in-out',
      }}
    >
      {isActive && colors && (
        <div style={{ padding: '4px 16px 2px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              padding: '3px 8px 3px 10px',
              borderRadius: 100,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {CATEGORY_ICONS[category] && (
                <img
                  src={CATEGORY_ICONS[category]}
                  alt=""
                  style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }}
                />
              )}
              <span style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600 }}>
                {categoryLabels[category as LocationCategory]}
              </span>
            </div>
            <button
              onClick={onClear}
              aria-label="Retirer le filtre"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
                border: 'none', cursor: 'pointer', color: colors.text,
                flexShrink: 0,
              }}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveCategoryBanner;
