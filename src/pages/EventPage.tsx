import { useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { shouldDisplayFavoriteCount } from '@/components/FavoriteCountBadge';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEvent, useOccurrencesForEvent } from '@/hooks/useEvents';
import { useEventFavorites } from '@/hooks/useEventFavorites';
import { useAuth } from '@/hooks/useAuth';
import { eventCategoryColor, eventCategoryEmoji, eventCategoryHex } from '@/types/event';
import { downloadIcs } from '@/lib/ics';
import { isPastEvent } from '@/lib/weekend';
import EventFeedbackCard from '@/components/EventFeedbackCard';
import { translateToken } from '@/i18n/tokenMaps';
import { formatDateLong, localeOf } from '@/lib/formatDate';

const EventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id ?? '');
  const { data: occurrences = [] } = useOccurrencesForEvent(id ?? '');
  const { isFavorite, toggleFavorite } = useEventFavorites();
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);

  const selectedOccurrence = useMemo(() => {
    if (occurrences.length === 0) return null;
    return occurrences.find((o) => o.id === selectedOccurrenceId) ?? occurrences.find((o) => !isPastEvent(o.date_start, o.date_end)) ?? occurrences[occurrences.length - 1];
  }, [occurrences, selectedOccurrenceId]);

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('common.loading')}
      </div>
    );
  }
  if (!event) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ fontFamily: 'Fraunces', fontSize: 18, marginBottom: 8 }}>{t('event.not_found')}</div>
        <button
          onClick={() => navigate('/sorties')}
          style={{
            padding: '10px 20px',
            borderRadius: 100,
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            fontFamily: 'DM Sans',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t('event.back_to_sorties')}
        </button>
      </div>
    );
  }

  const color = eventCategoryColor(event.category);
  const hex = eventCategoryHex(event.category);
  const fav = isFavorite(event.id);
  const past = isPastEvent(event.date_start, event.date_end);

  // Le bloc date et le CTA (calendrier / avis) suivent le créneau sélectionné
  // quand l'event en a plusieurs ; sinon on retombe sur les champs de
  // `event` (event à date unique, ou fetch des créneaux pas encore résolu).
  const displayDateStart = selectedOccurrence?.date_start ?? event.date_start;
  const displayDateEnd = selectedOccurrence?.date_end ?? event.date_end;
  const displayTime = selectedOccurrence?.time ?? event.time;
  const displayIsPast = selectedOccurrence ? isPastEvent(selectedOccurrence.date_start, selectedOccurrence.date_end) : past;

  return (
    <div style={{ paddingBottom: 140, background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(160deg, ${hex}22 0%, ${hex}55 100%)`,
          padding: '48px 20px 28px',
          position: 'relative',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
          }}
          aria-label={t('event.back')}
        >
          ←
        </button>
        {user && !past && (
          <button
            onClick={() => toggleFavorite.mutate(event.id)}
            aria-label={t('event.favorite')}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: fav ? '#D95F3B' : '#78716C',
            }}
          >
            {fav ? '♥' : '♡'}
          </button>
        )}

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 100,
            background: '#fff',
            color,
            fontFamily: 'DM Sans',
            fontSize: 12,
            fontWeight: 700,
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          <span>{eventCategoryEmoji(event.category)}</span>
          {translateToken('category_event', event.category)}
        </div>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          {event.name}
        </h1>
        {shouldDisplayFavoriteCount(event.favorites_count) && (
          <p className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            <Heart size={11} fill="currentColor" strokeWidth={0} />
            {t('explore.loved_by', { count: event.favorites_count ?? 0 })}
          </p>
        )}
      </div>

      {/* Date block */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: 16,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: color,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              📅
            </div>
            <div>
              <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 500, textTransform: 'capitalize' }}>
                {formatDateLong(displayDateStart)}
                {displayDateEnd && displayDateEnd !== displayDateStart && (
                  <> → {formatDateLong(displayDateEnd)}</>
                )}
              </div>
              {displayTime && (
                <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  🕐 {displayTime}
                </div>
              )}
            </div>
          </div>

          {occurrences.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                {t('event.dates_available', { count: occurrences.length })}
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {occurrences.map((occ) => {
                  const occPast = isPastEvent(occ.date_start, occ.date_end);
                  const isSelected = selectedOccurrence?.id === occ.id;
                  const fg = isSelected ? (occPast ? 'var(--text-muted)' : color) : 'var(--text)';
                  const bg = isSelected ? (occPast ? 'var(--bg)' : `color-mix(in srgb, ${color} 12%, transparent)`) : 'var(--surface)';
                  const border = isSelected ? (occPast ? 'var(--border)' : color) : 'var(--border)';
                  return (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => setSelectedOccurrenceId(occ.id)}
                      style={{
                        flexShrink: 0,
                        minWidth: 60,
                        padding: '7px 10px',
                        borderRadius: 12,
                        border: `${isSelected ? 1.5 : 1}px solid ${border}`,
                        background: bg,
                        color: fg,
                        cursor: 'pointer',
                        opacity: occPast && !isSelected ? 0.5 : 1,
                        textAlign: 'center',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600 }}>
                        {new Date(occ.date_start).toLocaleDateString(localeOf(), { weekday: 'short' }).replace('.', '').toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14 }}>{new Date(occ.date_start).getDate()}</div>
                      {occ.time && <div style={{ fontSize: 10 }}>{occ.time}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo */}
      {event.photo && (
        <div style={{ padding: '16px 16px 0' }}>
          <img
            src={event.photo}
            alt={event.name}
            style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 'var(--radius)' }}
          />
        </div>
      )}

      {/* Info grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InfoCell label={t('event.info_age')} value={ageLabel(event.age_min, event.age_max, t)} />
          <InfoCell label={t('event.info_duration')} value={event.duration ? translateToken('duration', event.duration) : null} />
          <InfoCell label={t('event.info_price')} value={event.price ? translateToken('price', event.price) : null} />
          <InfoCell label={t('event.info_weather')} value={event.weather ? translateToken('weather', event.weather) : null} />
        </div>
      </div>

      {/* Description */}
      {event.note && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500, marginBottom: 8 }}>
            {t('event.description')}
          </div>
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: 14,
              fontFamily: 'DM Sans',
              fontSize: 14,
              color: 'var(--text)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {event.note}
          </div>
        </div>
      )}

      {/* Mini map */}
      {event.lat != null && event.lng != null && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500, marginBottom: 8 }}>
            {t('event.location')}
          </div>
          {event.address && (
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              {event.address}
            </div>
          )}
          <div style={{ height: 200, borderRadius: 'var(--radius)', overflow: 'hidden', isolation: 'isolate' }}>
            <MapContainer
              center={[event.lat, event.lng]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <Marker
                position={[event.lat, event.lng]}
                icon={L.divIcon({
                  className: '',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
                  html: `<div style="width:40px;height:40px;border-radius:50%;background:#fff;border:2.5px solid ${hex};display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px ${hex}55;">${eventCategoryEmoji(event.category)}</div>`,
                })}
              />
            </MapContainer>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div style={{ padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {event.website && (
          <a
            href={event.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: 14,
              borderRadius: 100,
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(217,95,59,0.28)',
            }}
          >
            {t('event.more_details')}
          </a>
        )}
        {/* `displayIsPast` suit le créneau sélectionné : choisir une date passée
            d'un event qui a encore des créneaux à venir affiche l'avis sans le
            bandeau « terminé » (réservé à `past`, l'event entier). */}
        {displayIsPast ? (
          <>
            {past && (
              <div
                role="status"
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px dashed var(--border)',
                  background: '#E7E3DC',
                  color: 'var(--text-muted)',
                  fontFamily: 'DM Sans',
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span aria-hidden>↩</span>
                {t('event.finished_message')}
              </div>
            )}
            <EventFeedbackCard eventId={event.id} />
          </>
        ) : (
          <button
            onClick={() => downloadIcs({ ...event, date_start: displayDateStart, date_end: displayDateEnd, time: displayTime })}
            style={{
              padding: 13,
              borderRadius: 100,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'DM Sans',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('event.add_to_calendar')}
          </button>
        )}
        {event.instagram && (
          <a
            href={`https://instagram.com/${event.instagram.replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: 13,
              borderRadius: 100,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--primary)',
              fontFamily: 'DM Sans',
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            {t('event.instagram_link', { handle: event.instagram.replace(/^@/, '') })}
          </a>
        )}
      </div>
    </div>
  );
};

const InfoCell = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div
    style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius-sm)',
      padding: 12,
      boxShadow: 'var(--shadow)',
    }}
  >
    <div style={{ fontFamily: 'Caveat', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
    <div style={{ fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>
      {value ?? '—'}
    </div>
  </div>
);

const ageLabel = (min: number | null, max: number | null, t: (k: string, o?: any) => string) => {
  if (min == null && max == null) return t('event.age_all');
  if (min == null) return t('event.age_up_to', { max });
  if (max == null) return t('event.age_from', { min });
  if (min === max) return t('event.age_exact', { age: min });
  return t('event.age_range', { min, max });
};

export default EventPage;
