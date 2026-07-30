import { Heart } from 'lucide-react';

/**
 * En dessous de ce seuil, rien ne s'affiche : un « 1 » ou un « 2 » ne dit rien
 * de la popularité d'un lieu et signale surtout que le catalogue est jeune.
 * Seul point à changer quand le volume de favoris aura grandi — garder la
 * valeur alignée sur `FavoriteCountBadge.minimumToDisplay` (iOS) et sur la
 * constante du même nom côté Flutter.
 */
export const MINIMUM_TO_DISPLAY = 3;

export const shouldDisplayFavoriteCount = (count?: number | null) =>
  (count ?? 0) >= MINIMUM_TO_DISPLAY;

/**
 * Compteur public de favoris. N'expose qu'un total — jamais qui a liké.
 */
export const FavoriteCountBadge = ({ count }: { count: number }) => (
  <span
    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold"
    style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '100px', color: 'var(--primary)' }}
  >
    <Heart size={11} fill="currentColor" strokeWidth={0} />
    {count}
  </span>
);
