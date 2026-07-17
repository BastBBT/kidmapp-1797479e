import { useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useLocations } from '@/hooks/useLocations';
import { useAllEvents } from '@/hooks/useEvents';
import { useEventFavorites } from '@/hooks/useEventFavorites';
import LocationCard from '@/components/LocationCard';
import EventCard from '@/components/EventCard';
import Header from '@/components/Header';

type Tab = 'places' | 'events';

const SavedPage = () => {
  const [tab, setTab] = useState<Tab>('places');
  const { favoriteIds } = useFavorites();
  const { data: locations = [] } = useLocations();
  const { favoriteEventIds } = useEventFavorites();
  const { data: allEvents = [] } = useAllEvents(favoriteEventIds.length > 0);

  const saved = locations.filter((l) => favoriteIds.includes(l.id));
  const savedEvents = allEvents.filter((e) => favoriteEventIds.includes(e.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <Header />
      <div className="px-5 pt-6 pb-3">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Sauvegardés
        </h1>
        <p className="font-hand text-base mt-1" style={{ color: 'var(--text-muted)' }}>
          {tab === 'places'
            ? `${saved.length} lieu${saved.length !== 1 ? 'x' : ''} ♥`
            : `${savedEvents.length} événement${savedEvents.length !== 1 ? 's' : ''} ♥`}
        </p>
      </div>

      {/* Segmented control */}
      <div className="px-5 pb-4">
        <div
          style={{
            display: 'flex',
            padding: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 100,
          }}
        >
          {(['places', 'events'] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 100,
                  border: 'none',
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t === 'places' ? 'Lieux & activités' : 'Événements'}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'places' ? (
        saved.length === 0 ? (
          <EmptyState label="Aucun favori pour l'instant" hint="Appuyez sur ♥ sur une fiche lieu pour sauvegarder" />
        ) : (
          <div className="px-4 grid grid-cols-2 gap-3 pb-6">
            {saved.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        )
      ) : savedEvents.length === 0 ? (
        <EmptyState label="Aucun événement sauvegardé" hint="Appuyez sur ♥ sur une sortie pour la retrouver ici" />
      ) : (
        <div className="px-4 flex flex-col gap-3 pb-6">
          {savedEvents.map((event) => {
            const eventDate = new Date(event.date_end || event.date_start);
            eventDate.setHours(0, 0, 0, 0);
            const isPast = eventDate < today;
            return (
              <div key={event.id} style={{ opacity: isPast ? 0.5 : 1, filter: isPast ? 'grayscale(0.5)' : 'none' }}>
                <EventCard event={event} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ label, hint }: { label: string; hint: string }) => (
  <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
    <div className="text-5xl mb-4">♡</div>
    <p className="font-display text-lg font-medium mb-1" style={{ color: 'var(--text)' }}>
      {label}
    </p>
    <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
      {hint}
    </p>
  </div>
);

export default SavedPage;
