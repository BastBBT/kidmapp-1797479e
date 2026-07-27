import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import WeekendPicker from '@/components/WeekendPicker';
import EventsMap from '@/components/EventsMap';
import EventCard from '@/components/EventCard';
import EventCategoryFilter, { orderEventCategories } from '@/components/EventCategoryFilter';
import {
  buildWeeks,
  eventInWeek,
  eventSortRank,
  isPastEvent,
  todayISO,
  toISODate,
  type Week,
} from '@/lib/weekend';
import { useEvents } from '@/hooks/useEvents';
import { AgeBucket, matchesAgeBucket } from '@/lib/ageFilter';
import { formatMonthShort } from '@/lib/formatDate';

const SortiesPage = () => {
  const { t } = useTranslation();
  const [selectedAge, setSelectedAge] = useState<AgeBucket>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [showFinished, setShowFinished] = useState(false);
  const { data: events = [], isLoading } = useEvents();

  // Build weeks: always show last + current, plus any future week where at
  // least one event *starts* (avoids phantom tabs for long-running events
  // whose start date is far in the past).
  const weeks = useMemo<Week[]>(() => {
    const base = buildWeeks(12, new Date(), true); // last + current + 11 upcoming
    const [lastW, currentW, ...upcoming] = base;
    const keeps = upcoming.filter((w) => {
      const mon = toISODate(w.monday);
      const sun = toISODate(w.sunday);
      return events.some((ev) => ev.date_start >= mon && ev.date_start <= sun);
    });
    return [lastW, currentW, ...keeps].filter(Boolean);
  }, [events]);

  const defaultKey = useMemo(
    () => weeks.find((w) => !w.past)?.key ?? weeks[0]?.key ?? '',
    [weeks],
  );
  const [selectedKey, setSelectedKey] = useState<string>(defaultKey);

  useEffect(() => {
    setSelectedKey(defaultKey);
  }, [selectedAge, selectedCategory, defaultKey]);

  const selectedWeek = weeks.find((w) => w.key === selectedKey) ?? weeks[0];
  const today = todayISO();
  const showPast = selectedWeek ? toISODate(selectedWeek.monday) <= today : false;

  const availableCategories = useMemo(
    () => orderEventCategories(Array.from(new Set(events.map((e) => e.category).filter(Boolean) as string[]))),
    [events],
  );

  const filteredEvents = useMemo(() => {
    if (!selectedWeek) return [];
    const mondayISO = toISODate(selectedWeek.monday);
    return events
      .filter((ev) => eventInWeek(ev.date_start, ev.date_end, selectedWeek))
      .filter((ev) => matchesAgeBucket(ev as any, selectedAge))
      .filter((ev) => selectedCategory === 'all' || ev.category === selectedCategory)
      .sort((a, b) => {
        // Tri à 3 paliers : les events courts (journée / week-end) d'abord, puis
        // les longs (expos, festivals sur plusieurs semaines) qui sinon
        // squattent le haut de liste avec leur date de début lointaine, et
        // enfin ceux déjà terminés.
        const ra = eventSortRank(a.date_start, a.date_end);
        const rb = eventSortRank(b.date_start, b.date_end);
        if (ra !== rb) return ra - rb;
        // À rang égal : date de début « ramenée » au lundi de la semaine.
        const ka = a.date_start < mondayISO ? mondayISO : a.date_start;
        const kb = b.date_start < mondayISO ? mondayISO : b.date_start;
        return ka.localeCompare(kb);
      });
  }, [events, selectedWeek, selectedAge, selectedCategory]);

  // Dans une semaine en cours ou à venir, les events individuellement terminés
  // (l'atelier de lundi consulté le jeudi) sont masqués par défaut. Une semaine
  // entièrement passée reste affichée en entier : c'est son sens même.
  const weekIsPast = selectedWeek?.past ?? false;
  const finishedCount = useMemo(
    () => (weekIsPast ? 0 : filteredEvents.filter((ev) => isPastEvent(ev.date_start, ev.date_end)).length),
    [filteredEvents, weekIsPast],
  );
  const displayedEvents = useMemo(
    () =>
      weekIsPast || showFinished
        ? filteredEvents
        : filteredEvents.filter((ev) => !isPastEvent(ev.date_start, ev.date_end)),
    [filteredEvents, weekIsPast, showFinished],
  );

  const hasActiveFilter = selectedAge !== 'all' || selectedCategory !== 'all';

  const currentKey = todayISO && weeks.find((w) => !w.past)?.key;
  const localizedWeeks = useMemo(
    () =>
      weeks.map((w) => ({
        key: w.key,
        past: w.past,
        label: w.past
          ? t('week.last')
          : w.key === currentKey
            ? t('week.current')
            : t('week.of', { date: `${w.monday.getDate()} ${formatMonthShort(w.monday)}` }),
      })),
    [weeks, currentKey, t],
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <Header
        selectedAge={selectedAge}
        onAgeChange={setSelectedAge}
      />

      <div style={{ padding: '8px 16px 4px' }}>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          {t('sorties.title')}
        </h1>
        <p style={{ fontFamily: 'Caveat', fontSize: 15, color: 'var(--text-muted)', marginTop: 2 }}>
          {t('sorties.subtitle')}
        </p>
      </div>

      {availableCategories.length >= 2 && (
        <div style={{ padding: '4px 16px 8px' }}>
          <EventCategoryFilter
            available={availableCategories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
      )}

      <WeekendPicker weekends={localizedWeeks} selectedKey={selectedKey} onChange={setSelectedKey} />

      <div style={{ padding: '8px 16px' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {isLoading
            ? t('common.loading')
            : t('sorties.count', { count: displayedEvents.length, defaultValue: `${displayedEvents.length} événements` })}
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
        <EventsMap events={displayedEvents} />
      </div>

      {/* Toggle « événements terminés » — seulement s'il y en a à masquer */}
      {finishedCount > 0 && (
        <div style={{ padding: '0 16px 10px' }}>
          <button
            type="button"
            onClick={() => setShowFinished((v) => !v)}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span aria-hidden style={{ fontSize: 13 }}>{showFinished ? '☑' : '☐'}</span>
            {showFinished ? t('sorties.hide_finished') : t('sorties.show_finished', { count: finishedCount })}
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayedEvents.length === 0 && !isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>🎪</div>
            <div style={{ fontFamily: 'Caveat', fontSize: 17, color: 'var(--text-muted)' }}>
              {hasActiveFilter ? t('sorties.empty_filtered') : t('sorties.empty')}
            </div>
          </div>
        ) : (
          displayedEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} showPast={showPast} />
          ))
        )}
      </div>
    </div>
  );
};

export default SortiesPage;
