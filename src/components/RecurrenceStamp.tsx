import { useTranslation } from 'react-i18next';
import { translateToken } from '@/i18n/tokenMaps';
import { eventCategoryHex } from '@/types/event';

/**
 * Repère d'un rendez-vous récurrent installé dans un lieu : une pastille pleine
 * suivie d'un tampon pointillé portant la cadence. Miroir de `RecurrenceStamp`
 * (iOS `DesignSystem.swift`, Android `widgets/recurrence_stamp.dart`).
 *
 * Se pose dans la ligne du badge de catégorie, jamais en overlay sur le titre :
 * un titre long fait déborder la version posée sur la carte.
 */
interface Props {
  /** Cadence courte écrite par l'admin (« Chaque semaine », « Mar. & mer. »). */
  label: string;
  category?: string | null;
  compact?: boolean;
}

const RecurrenceStamp = ({ label, category, compact = true }: Props) => {
  const { t } = useTranslation();
  const color = eventCategoryHex(category);
  // Le texte et la bordure sont assombris : mesuré selon WCAG, 4 des 6 teintes
  // d'événement échouent le contraste 4,5:1 en direct sur blanc — l'orange
  // `#EF9F27` plafonne à ~2,2:1. 38 % de noir remonte ce pire cas à ~5,2:1.
  const ink = `color-mix(in srgb, ${color} 62%, black)`;
  const dot = compact ? 16 : 18;
  const text = translateToken('recurrence', label);

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}
      aria-label={t('event.recurring', { cadence: text })}
    >
      <span
        aria-hidden="true"
        style={{
          width: dot,
          height: dot,
          flexShrink: 0,
          borderRadius: '50%',
          background: color,
          color: '#fff',
          fontSize: compact ? 9 : 10,
          lineHeight: `${dot}px`,
          textAlign: 'center',
        }}
      >
        ↻
      </span>
      <span
        style={{
          fontSize: compact ? 10 : 11,
          fontWeight: 600,
          color: ink,
          border: `1px dashed color-mix(in srgb, ${ink} 50%, transparent)`,
          borderRadius: 6,
          padding: compact ? '2px 7px' : '3px 7px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {text}
      </span>
    </span>
  );
};

export default RecurrenceStamp;
