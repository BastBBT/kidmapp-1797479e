import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { AGE_LABEL_KEY, ChildAgeBucket } from '@/lib/ageFilter';
import { childDisplayLabel, childFilterEmoji } from '@/lib/children';
import type { AgeBandCrossing } from '@/hooks/useChildren';

/** Emoji générique de la tranche d'arrivée — délibérément pas l'emoji propre à
 *  l'enfant : la flèche raconte un changement de tranche, pas un autre enfant. */
const BAND_EMOJI: Record<ChildAgeBucket, string> = {
  '0-2': '🍼',
  '3-5': '🧒',
  '6+': '🌟',
};

interface Props {
  crossing: AgeBandCrossing;
  onSeeMore: () => void;
  onDismiss: () => void;
}

/**
 * Écran 11 — célébration de franchissement de tranche. Montée en tête
 * d'Explorer uniquement (jamais Sorties), et seulement si aucun canal digest
 * n'est actif : dès qu'un canal existe, c'est lui qui portera la célébration.
 */
const AgeBandCelebrationCard = ({ crossing, onSeeMore, onDismiss }: Props) => {
  const { t } = useTranslation();
  const name = childDisplayLabel(crossing.child, t('children.unnamed'));
  const bandLabel = t(AGE_LABEL_KEY[crossing.to]);

  return (
    <div
      style={{
        position: 'relative',
        padding: 16,
        borderRadius: 'var(--radius)',
        border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
        background: 'linear-gradient(to bottom, var(--accent-light), var(--surface))',
        textAlign: 'center',
      }}
    >
      <button
        onClick={onDismiss}
        aria-label={t('common.close')}
        style={{
          position: 'absolute', top: 8, right: 8, padding: 4,
          background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
        }}
      >
        <X size={14} />
      </button>

      <div style={{ fontSize: 30, lineHeight: 1.2 }}>
        {childFilterEmoji(crossing.child.id)} → {BAND_EMOJI[crossing.to]}
      </div>

      <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500, color: 'var(--text)', marginTop: 8 }}>
        {t('children.celebration_title', { name })}
      </div>

      <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)', margin: '6px auto 0', maxWidth: 280 }}>
        {t('children.celebration_body', { band: bandLabel })}
      </p>

      <button
        onClick={onSeeMore}
        style={{
          marginTop: 12, padding: '11px 20px', borderRadius: 100,
          border: 'none', background: 'var(--primary)', color: '#fff',
          fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {t('children.celebration_cta', { band: bandLabel })}
      </button>
    </div>
  );
};

export default AgeBandCelebrationCard;
