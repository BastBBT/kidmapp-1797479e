import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import AgeFilter from '@/components/AgeFilter';
import WeekendPicker from '@/components/WeekendPicker';
import EventsMap from '@/components/EventsMap';
import EventCard from '@/components/EventCard';
import { buildWeekends, eventInWeekend } from '@/lib/weekend';
import { useEvents } from '@/hooks/useEvents';
import { AgeBucket, matchesAgeBucket } from '@/lib/ageFilter';

const SortiesPage = () => {
  const weekends = useMemo(() => buildWeekends(8), []);
  const [selectedKey, setSelectedKey] = useState<string>(weekends[0]?.key ?? '');
  const [selectedAge, setSelectedAge] = useState<AgeBucket>('all');
  const { data: events = [], isLoading } = useEvents();

  const selectedWeekend = weekends.find((w) => w.key === selectedKey) ?? weekends[0];

  const filteredEvents = useMemo(() => {
    if (!selectedWeekend) return [];
    return events
      .filter((ev) => eventInWeekend(ev.date_start, ev.date_end, selectedWeekend))
      .filter((ev) => matchesAgeBucket(ev as any, selectedAge))
      .sort((a, b) => a.date_start.localeCompare(b.date_start));
  }, [events, selectedWeekend, selectedAge]);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <Header
        selectedAge={selectedAge}
        onAgeChange={setSelectedAge}
      />

      <div style={{ padding: '8px 16px 4px' }}>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Sorties du week-end
        </h1>
        <p style={{ fontFamily: 'Caveat', fontSize: 15, color: 'var(--text-muted)', marginTop: 2 }}>
          Événements à faire en famille près de Nantes ✦
        </p>
      </div>

      <WeekendPicker weekends={weekends} selectedKey={selectedKey} onChange={setSelectedKey} />

      <div style={{ padding: '8px 16px' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {isLoading
            ? 'Chargement…'
            : `${filteredEvents.length} événement${filteredEvents.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Map */}
      <div
        style={{
          margin: '0 16px 12px',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          height: 220,
          isolation: 'isolate',
          zIndex: 0,
        }}
      >
        <EventsMap events={filteredEvents} />
      </div>

      {/* List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredEvents.length === 0 && !isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🎪</div>
            <div style={{ fontFamily: 'Caveat', fontSize: 17, color: 'var(--text-muted)' }}>
              Pas d'événement pour ce week-end ✦
            </div>
          </div>
        ) : (
          filteredEvents.map((ev) => <EventCard key={ev.id} event={ev} />)
        )}
      </div>
    </div>
  );
};

export default SortiesPage;
