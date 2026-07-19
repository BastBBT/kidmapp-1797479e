import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import WeekendPicker from '@/components/WeekendPicker';
import EventsMap from '@/components/EventsMap';
import EventCard from '@/components/EventCard';
import { buildWeeks, eventInWeek, todayISO, toISODate } from '@/lib/weekend';
import { useEvents } from '@/hooks/useEvents';
import { AgeBucket, matchesAgeBucket } from '@/lib/ageFilter';

const SortiesPage = () => {
  const weeks = useMemo(() => buildWeeks(8, new Date(), true), []);
  const defaultKey = useMemo(
    () => weeks.find((w) => !w.past)?.key ?? weeks[0]?.key ?? '',
    [weeks],
  );
  const [selectedKey, setSelectedKey] = useState<string>(defaultKey);
  const [selectedAge, setSelectedAge] = useState<AgeBucket>('all');
  const { data: events = [], isLoading } = useEvents();

  useEffect(() => {
    setSelectedKey(defaultKey);
  }, [selectedAge, defaultKey]);

  const selectedWeek = weeks.find((w) => w.key === selectedKey) ?? weeks[0];
  const today = todayISO();
  // Show past styling for weeks that started already (past OR current week):
  // an event on Wed viewed on Thu should appear grayed "Terminé".
  const showPast = selectedWeek ? toISODate(selectedWeek.monday) <= today : false;

  const filteredEvents = useMemo(() => {
    if (!selectedWeek) return [];
    return events
      .filter((ev) => eventInWeek(ev.date_start, ev.date_end, selectedWeek))
      .filter((ev) => matchesAgeBucket(ev as any, selectedAge))
      .sort((a, b) => a.date_start.localeCompare(b.date_start));
  }, [events, selectedWeek, selectedAge]);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <Header
        selectedAge={selectedAge}
        onAgeChange={setSelectedAge}
      />

      <div style={{ padding: '8px 16px 4px' }}>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Sorties de la semaine
        </h1>
        <p style={{ fontFamily: 'Caveat', fontSize: 15, color: 'var(--text-muted)', marginTop: 2 }}>
          Les événements kids, semaine après semaine ✦
        </p>
      </div>

      <WeekendPicker weekends={weeks} selectedKey={selectedKey} onChange={setSelectedKey} />

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
              Pas d'événement pour cette semaine ✦
            </div>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} showPast={showPast} />
          ))
        )}
      </div>
    </div>
  );
};

export default SortiesPage;
