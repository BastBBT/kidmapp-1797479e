import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { eventCategoryEmoji, eventCategoryHex, eventCategoryInk } from '@/types/event';
import { useEventFavorites } from '@/hooks/useEventFavorites';
import { useAuth } from '@/hooks/useAuth';
import { translateToken } from '@/i18n/tokenMaps';
import { shouldDisplayFavoriteCount } from '@/components/FavoriteCountBadge';
import FarBadge from '@/components/FarBadge';
import { useProximityZone } from '@/hooks/useProximityZone';
import { eventFarInfo } from '@/lib/proximity';
import { formatAgeRangeI18n } from '@/lib/ageFormat';
import { slotStartLabel, type DayCard } from '@/lib/sortiesFilters';

/** Ajoutée depuis moins d'une semaine. */
const isNew = (createdAt: string | null | undefined): boolean => {
  if (!createdAt) return false;
  const d = new Date(`${createdAt.slice(0, 10)}T00:00:00`);
  return !isNaN(d.getTime()) && Date.now() - d.getTime() < 7 * 86400000;
};

const Chip = ({ label, color = 'var(--text-muted)', bg = 'var(--bg)' }: { label: string; color?: string; bg?: string }) => (
  <span style={{ fontFamily: 'DM Sans', fontSize: 12, color, background: bg, borderRadius: 999, padding: '2px 8px' }}>
    {label}
  </span>
);

/**
 * Carte compacte de la liste Sorties par jour : l'heure en marge, puis le nom,
 * le lieu et les repères utiles. Les autres séances du même jour tiennent dans
 * une pastille (« Aussi à 17h15 ») plutôt que dans des cartes répétées.
 * Miroir de `EventDayCard` (iOS, Android).
 */
const EventDayCard = ({ card }: { card: DayCard }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useEventFavorites();
  const zone = useProximityZone();
  const event = card.slot.event;
  const far = eventFarInfo(zone, event);
  const hex = eventCategoryHex(event.category);
  const place = event.address?.trim();
  const favorite = isFavorite(event.id);
  const openEvent = () => navigate(`/event/${event.id}`);

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* La marge ne garde que l'heure de début ; la fin reste sur la fiche. */}
      <div style={{ width: 46, flexShrink: 0, paddingTop: 14, fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
        {slotStartLabel(card.slot) ?? '—'}
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={openEvent}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEvent();
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: `4px solid ${hex}`,
          borderRadius: 14,
          padding: '9px 11px 10px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <span
            style={{
              flex: 1, fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, lineHeight: 1.2, color: 'var(--text)',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {event.name}
          </span>
          {user && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite.mutate(event.id);
              }}
              aria-label={t('event.favorite')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 24, minHeight: 24, fontSize: 16, color: favorite ? '#D95F3B' : 'var(--border)' }}
            >
              {favorite ? '♥' : '♡'}
            </button>
          )}
        </div>
        <span
          style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {eventCategoryEmoji(event.category)} {translateToken('category_event', event.category)}
          {place ? ` · ${place}` : ''}
        </span>
        {far && <FarBadge info={far} style={{ alignSelf: 'flex-start' }} />}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
          {event.is_free === true ? (
            <Chip label={t('sorties.free')} />
          ) : (
            event.price && <Chip label={translateToken('price', event.price)} />
          )}
          <Chip label={formatAgeRangeI18n(t, event.age_min_months, event.age_max_months)} />
          {shouldDisplayFavoriteCount(event.favorites_count) && (
            <Chip label={`♥ ${event.favorites_count}`} color="var(--primary)" bg="var(--primary-light)" />
          )}
          {isNew(event.created_at) && <Chip label={t('sorties.new_badge')} color="var(--secondary)" bg="var(--secondary-light)" />}
          {card.otherTimes.length > 0 && (
            <Chip
              label={t('sorties.also_at', { times: card.otherTimes.join(', ') })}
              color={eventCategoryInk(event.category) === '#fff' ? hex : '#412402'}
              bg={`${hex}24`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDayCard;
