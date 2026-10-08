import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FarInfo } from '@/lib/proximity';

/**
 * Pastille sombre « Pornic · 45 km », posée sur une photo. Sombre et non blanche : les
 * pastilles blanches de la carte (« Coup de ♥ », compteur de favoris) parlent d'affection,
 * celle-ci informe. Miroir de `FarBadge` (iOS / Android).
 */
const FarBadge = ({ info, className, style }: { info: FarInfo; className?: string; style?: React.CSSProperties }) => {
  const { t } = useTranslation();
  const label = info.city ? `${info.city} · ${info.km} km` : `${info.km} km`;
  return (
    <span
      className={className}
      role="img"
      aria-label={t('far_badge.aria', { km: info.km })}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%',
        padding: '4px 8px', borderRadius: 100,
        background: 'rgba(28,25,23,0.72)', color: '#fff',
        fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <MapPin size={10} aria-hidden style={{ flexShrink: 0 }} />
      <span aria-hidden style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </span>
  );
};

export default FarBadge;
