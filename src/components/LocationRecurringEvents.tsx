import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecurringEventsAtLocation } from '@/hooks/useEvents';
import { eventCategoryEmoji, eventCategoryHex, hasRecurrence } from '@/types/event';
import { formatDateShort } from '@/lib/formatDate';
import RecurrenceStamp from '@/components/RecurrenceStamp';

/**
 * Les sorties liées à ce lieu : rendez-vous récurrents (LAEP, atelier hebdo,
 * avec leur tampon de cadence) d'abord, puis sorties ponctuelles à venir avec
 * leur date. Miroir de la section « Sorties à venir ici » d'iOS et Android.
 * Ne rend rien du tout sur un lieu ordinaire : la fiche ne doit pas gagner un
 * titre vide.
 */
interface Props {
  locationId: string;
}

/**
 * Au-delà de ce nombre, la liste se replie et une poignée permet de la
 * dérouler — un lieu très actif (grand musée, château) ne doit pas noyer le
 * reste de la fiche.
 */
const COLLAPSED_COUNT = 5;

const LocationRecurringEvents = ({ locationId }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: items = [] } = useRecurringEventsAtLocation(locationId);
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const showToggle = items.length > 10;
  const visible = showToggle && !expanded ? items.slice(0, COLLAPSED_COUNT) : items;

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <h2 className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
        {t('location_page.recurring_events_title')}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visible.map(({ event: ev, occurrence }) => {
          const color = eventCategoryHex(ev.category);
          const recurring = hasRecurrence(ev);
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => navigate(`/event/${ev.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {eventCategoryEmoji(ev.category)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'DM Sans',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 3,
                  }}
                >
                  {ev.name}
                </span>
                {recurring ? (
                  <RecurrenceStamp label={ev.recurrence_label ?? ''} category={ev.category} />
                ) : (
                  // Pas de cadence connue pour une sortie ponctuelle : on montre la
                  // date de son prochain créneau (`occurrence`, pas `ev.date_start`
                  // qui reste figé sur la toute première date passée) — sinon la
                  // liste ne dit pas quand elle a lieu.
                  <span style={{ fontFamily: 'DM Sans', fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {formatDateShort(occurrence?.date_start ?? ev.date_start)}
                  </span>
                )}
              </span>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>›</span>
            </button>
          );
        })}
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            marginTop: 8,
            padding: '8px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'DM Sans',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--primary)',
          }}
        >
          {expanded
            ? t('location_page.collapse')
            : t('location_page.show_more', { count: items.length - COLLAPSED_COUNT })}
          <span aria-hidden="true" style={{ fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
        </button>
      )}
    </div>
  );
};

export default LocationRecurringEvents;
