import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EventItem, EventOccurrence, eventCategoryColor, eventCategoryEmoji } from '@/types/event';
import { isPastEvent } from '@/lib/weekend';
import { useEventFavorites } from '@/hooks/useEventFavorites';
import { useAuth } from '@/hooks/useAuth';
import { translateToken } from '@/i18n/tokenMaps';
import { formatEventDateRange } from '@/lib/formatDate';
import { Heart } from 'lucide-react';
import { shouldDisplayFavoriteCount } from '@/components/FavoriteCountBadge';
import { supabaseResized, onResizedImageError } from '@/lib/imageUrl';

interface Props {
  event: EventItem;
  showPast?: boolean;
  /**
   * Créneau précis à afficher — renseigné par le calendrier, où la carte
   * appartient à un jour donné. La ligne de date et l'état « terminé » portent
   * alors sur ce créneau et non sur la date synchronisée de l'event.
   */
  occurrence?: EventOccurrence;
  /** Nombre de créneaux de l'event (1 pour un event à date unique). */
  occurrenceCount?: number;
}

const EventCard = ({ event, showPast = false, occurrence, occurrenceCount = 1 }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useEventFavorites();
  const dateStart = occurrence?.date_start ?? event.date_start;
  const dateEnd = occurrence ? occurrence.date_end : event.date_end;
  const time = occurrence ? occurrence.time : event.time;
  const past = isPastEvent(dateStart, dateEnd);
  const color = eventCategoryColor(event.category);
  const dateLabel = formatEventDateRange(dateStart, dateEnd, time, past && showPast);
  // « Prochaine : » ne s'affiche que s'il y a d'autres créneaux ET qu'on n'est
  // pas déjà sur un créneau précis (calendrier) — sinon ce serait la seule
  // date affichée sur cette carte, pas la « prochaine » d'une liste.
  const dateLine = occurrenceCount > 1 && !occurrence ? t('event.next_date', { date: dateLabel }) : dateLabel;

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        padding: 0,
        cursor: 'pointer',
        boxShadow: 'var(--shadow)',
        opacity: past && showPast ? 0.55 : 1,
        filter: past && showPast ? 'grayscale(0.4)' : 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: 6,
          background: color,
        }}
      />
      {event.photo && (
        <div style={{ width: '100%', height: 140, overflow: 'hidden' }}>
          <img
            src={supabaseResized(event.photo, { width: 600, height: 300, quality: 75 })}
            onError={onResizedImageError(event.photo)}
            alt={event.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              padding: '3px 8px',
              borderRadius: 100,
            }}
          >
            {eventCategoryEmoji(event.category)} {translateToken('category_event', event.category)}
          </span>
          {past && showPast && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-muted)',
                background: 'var(--bg)',
                padding: '3px 8px',
                borderRadius: 100,
              }}
            >
              {t('event.past_badge')}
            </span>
          )}
        </div>
        <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, color: 'var(--text)', lineHeight: 1.25 }}>
          {event.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Caveat', fontSize: 15, color: 'var(--text-muted)' }}>{dateLine}</span>
          {/* Le badge dit « cet event rejoue ailleurs », une information vraie
              quelle que soit la date affichée : il reste donc visible sur une
              carte de créneau. Seul le préfixe « Prochaine : » disparaît, lui
              qui ne vaut que pour une carte affichant la date la plus proche. */}
          {occurrenceCount > 1 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                padding: '2px 7px',
                borderRadius: 100,
                whiteSpace: 'nowrap',
              }}
            >
              {t('event.extra_dates', { count: occurrenceCount - 1 })}
            </span>
          )}
        </div>
        {event.address && (
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {event.address}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {/* Compteur public, en gris : il informe, il ne se confond pas avec le
              bouton cœur flottant qui est mon propre favori. */}
          {shouldDisplayFavoriteCount(event.favorites_count) && (
            <span
              className="inline-flex items-center gap-1"
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: 'var(--bg)', color: 'var(--text-muted)' }}
            >
              <Heart size={10} fill="currentColor" strokeWidth={0} />
              {event.favorites_count}
            </span>
          )}
          {event.duration && (
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: 'var(--bg)', color: 'var(--text-muted)' }}>
              ⏱ {translateToken('duration', event.duration)}
            </span>
          )}
          {event.price && (
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: 'var(--bg)', color: 'var(--text-muted)' }}>
              {translateToken('price', event.price)}
            </span>
          )}
          {event.weather && (
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: 'var(--bg)', color: 'var(--text-muted)' }}>
              {translateToken('weather', event.weather)}
            </span>
          )}
        </div>
      </div>
      {user && !(past && showPast) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite.mutate(event.id);
          }}
          aria-label={t('event.favorite')}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span style={{ fontSize: 16, color: isFavorite(event.id) ? '#D95F3B' : '#78716C' }}>
            {isFavorite(event.id) ? '♥' : '♡'}
          </span>
        </button>
      )}
    </button>
  );
};

export default EventCard;
