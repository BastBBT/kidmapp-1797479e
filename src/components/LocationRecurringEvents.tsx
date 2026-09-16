import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRecurringEventsAtLocation } from '@/hooks/useEvents';
import { eventCategoryEmoji, eventCategoryHex } from '@/types/event';
import RecurrenceStamp from '@/components/RecurrenceStamp';

/**
 * Les sorties qui reviennent dans ce lieu (LAEP, atelier hebdo). Miroir de la
 * section « Ça revient ici régulièrement » d'iOS et Android. Ne rend rien du
 * tout sur un lieu ordinaire : la fiche ne doit pas gagner un titre vide.
 */
interface Props {
  locationId: string;
}

const LocationRecurringEvents = ({ locationId }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: events = [] } = useRecurringEventsAtLocation(locationId);

  if (events.length === 0) return null;

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <h2 className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
        {t('location_page.recurring_events_title')}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map((ev) => {
          const color = eventCategoryHex(ev.category);
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
                <RecurrenceStamp label={ev.recurrence_label ?? ''} category={ev.category} />
              </span>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LocationRecurringEvents;
