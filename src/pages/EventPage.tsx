import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEvent } from '@/hooks/useEvents';
import { useEventFavorites } from '@/hooks/useEventFavorites';
import { useAuth } from '@/hooks/useAuth';
import { eventCategoryColor, eventCategoryEmoji, eventCategoryHex } from '@/types/event';
import { downloadIcs } from '@/lib/ics';
import { isPastEvent } from '@/lib/weekend';
import EventFeedbackCard from '@/components/EventFeedbackCard';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const EventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id ?? '');
  const { isFavorite, toggleFavorite } = useEventFavorites();

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement…
      </div>
    );
  }
  if (!event) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ fontFamily: 'Fraunces', fontSize: 18, marginBottom: 8 }}>Événement introuvable</div>
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
          Retour aux sorties
        </button>
      </div>
    );
  }

  const color = eventCategoryColor(event.category);
  const hex = eventCategoryHex(event.category);
  const fav = isFavorite(event.id);
  const past = isPastEvent(event.date_start, event.date_end);

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
          aria-label="Retour"
        >
          ←
        </button>
        {user && !past && (
          <button
            onClick={() => toggleFavorite.mutate(event.id)}
            aria-label="Favori"
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
          {event.category}
        </div>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          {event.name}
        </h1>
      </div>

      {/* Date block */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: 16,
            boxShadow: 'var(--shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
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
              {formatDate(event.date_start)}
              {event.date_end && event.date_end !== event.date_start && (
                <> → {formatDate(event.date_end)}</>
              )}
            </div>
            {event.time && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                🕐 {event.time}
              </div>
            )}
          </div>
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
          <InfoCell label="Âge" value={ageLabel(event.age_min, event.age_max)} />
          <InfoCell label="Durée" value={event.duration} />
          <InfoCell label="Prix" value={event.price} />
          <InfoCell label="Météo" value={event.weather} />
        </div>
      </div>

      {/* Description */}
      {event.note && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 17, fontWeight: 500, marginBottom: 8 }}>
            Description
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
            Localisation
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
            Voir plus de détails ↗
          </a>
        )}
        {past ? (
          <>
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
              Cet événement est terminé
            </div>
            <EventFeedbackCard eventId={event.id} />
          </>
        ) : (
          <button
            onClick={() => downloadIcs(event)}
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
            📅 Ajouter à mon calendrier
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
            @{event.instagram.replace(/^@/, '')} sur Instagram
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

const ageLabel = (min: number | null, max: number | null) => {
  if (min == null && max == null) return 'Tous âges';
  if (min == null) return `Jusqu'à ${max} ans`;
  if (max == null) return `Dès ${min} ans`;
  if (min === max) return `${min} ans`;
  return `${min}–${max} ans`;
};

export default EventPage;
