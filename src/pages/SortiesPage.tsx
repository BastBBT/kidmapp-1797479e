import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { useEvents, useEventOccurrences } from '@/hooks/useEvents';
import { AgeBucket, matchesAgeBucket } from '@/lib/ageFilter';
import { formatMonthShort, localeOf } from '@/lib/formatDate';
import EventsCalendar from '@/components/EventsCalendar';
import {
  buildSlots,
  dateFromISO,
  defaultSelectedDay,
  distinctEvents,
  longEventsOn,
  shortSlotsByDay,
  shortSlotsOn,
  weekSlots,
} from '@/lib/eventCalendar';
import { eventCategoryEmoji, eventCategoryHex } from '@/types/event';

const CALENDAR_MODE_KEY = 'sorties.calendarMode';

const SortiesPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedAge, setSelectedAge] = useState<AgeBucket>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [showFinished, setShowFinished] = useState(false);
  const { data: events = [], isLoading } = useEvents();
  // Créneaux des events chargés : le calendrier pose une pastille par créneau,
  // pas une par event. Sans eux, il retombe sur la date portée par l'event.
  const eventIds = useMemo(() => events.map((ev) => ev.id), [events]);
  const { data: occurrencesByEvent = {} } = useEventOccurrences(eventIds);

  // Base commune des deux modes : chaque event déplié en autant de créneaux
  // qu'il en porte, puis filtré par âge et catégorie.
  const allSlots = useMemo(() => buildSlots(events, occurrencesByEvent), [events, occurrencesByEvent]);
  const filteredSlots = useMemo(
    () =>
      allSlots
        .filter(({ event }) => matchesAgeBucket(event, selectedAge))
        .filter(({ event }) => selectedCategory === 'all' || event.category === selectedCategory),
    [allSlots, selectedAge, selectedCategory],
  );

  // Mode d'affichage retenu d'une session à l'autre. La liste reste le défaut :
  // c'est le comportement historique de l'onglet.
  const [calendarMode, setCalendarMode] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(CALENDAR_MODE_KEY) === '1',
  );
  const [monthExpanded, setMonthExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayISO());
  const [dayTouched, setDayTouched] = useState(false);

  const switchMode = (calendar: boolean) => {
    setCalendarMode(calendar);
    window.localStorage.setItem(CALENDAR_MODE_KEY, calendar ? '1' : '0');
  };

  // Build weeks: always show last + current, plus any future week where at
  // least one *créneau* starts (avoids phantom tabs for long-running events
  // whose start date is far in the past). Un event à plusieurs dates ouvre donc
  // un onglet par semaine où il joue.
  const weeks = useMemo<Week[]>(() => {
    const base = buildWeeks(12, new Date(), true); // last + current + 11 upcoming
    const [lastW, currentW, ...upcoming] = base;
    const keeps = upcoming.filter((w) => {
      const mon = toISODate(w.monday);
      const sun = toISODate(w.sunday);
      return allSlots.some(
        ({ occurrence }) => occurrence.date_start >= mon && occurrence.date_start <= sun,
      );
    });
    return [lastW, currentW, ...keeps].filter(Boolean);
  }, [allSlots]);

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

  // L'unité de la liste est le créneau et non l'event : un spectacle joué trois
  // samedis apparaît dans les trois semaines, chaque fois à sa date.
  const selectedWeekSlots = useMemo(
    () => (selectedWeek ? weekSlots(filteredSlots, selectedWeek) : []),
    [filteredSlots, selectedWeek],
  );

  // Dans une semaine en cours ou à venir, les créneaux individuellement terminés
  // (l'atelier de lundi consulté le jeudi) sont masqués par défaut. Une semaine
  // entièrement passée reste affichée en entier : c'est son sens même.
  const weekIsPast = selectedWeek?.past ?? false;
  const finishedCount = useMemo(
    () =>
      weekIsPast
        ? 0
        : selectedWeekSlots.filter(({ occurrence }) => isPastEvent(occurrence.date_start, occurrence.date_end))
            .length,
    [selectedWeekSlots, weekIsPast],
  );
  const displayedSlots = useMemo(
    () =>
      weekIsPast || showFinished
        ? selectedWeekSlots
        : selectedWeekSlots.filter(({ occurrence }) => !isPastEvent(occurrence.date_start, occurrence.date_end)),
    [selectedWeekSlots, weekIsPast, showFinished],
  );
  // La mini-carte ne veut qu'un marqueur par lieu : deux créneaux du même event
  // ne doivent pas se superposer.
  const displayedEvents = useMemo(() => distinctEvents(displayedSlots), [displayedSlots]);

  const hasActiveFilter = selectedAge !== 'all' || selectedCategory !== 'all';

  // ---- Mode calendrier ----
  // Le calendrier raisonne sur tous les créneaux filtrés, pas sur une seule
  // semaine : c'est lui qui porte la navigation dans le temps.
  const byDay = useMemo(() => shortSlotsByDay(filteredSlots), [filteredSlots]);
  const calendarDefaultDay = useMemo(() => defaultSelectedDay(byDay), [byDay]);

  // Tant que l'utilisateur n'a pas choisi de jour, on suit le premier jour
  // porteur d'événements — y compris après un changement de filtre.
  useEffect(() => {
    if (!dayTouched) setSelectedDay(calendarDefaultDay);
  }, [calendarDefaultDay, dayTouched]);
  useEffect(() => {
    setDayTouched(false);
  }, [selectedAge, selectedCategory]);

  const daySlots = useMemo(() => shortSlotsOn(byDay, selectedDay), [byDay, selectedDay]);
  const dayLongEvents = useMemo(
    () => longEventsOn(filteredSlots, selectedDay),
    [filteredSlots, selectedDay],
  );
  const dayTitle = useMemo(() => {
    const s = dateFromISO(selectedDay).toLocaleDateString(localeOf(i18n.language), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [selectedDay, i18n.language]);

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

      {/* Liste ↔ Calendrier. La carte reste en mode liste : au format téléphone
          elle ne cohabite pas avec une grille de dates. */}
      <div style={{ padding: '4px 16px 8px' }}>
        <div
          role="tablist"
          aria-label={t('sorties.view_mode')}
          style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--border)', borderRadius: 999 }}
        >
          {([false, true] as const).map((calendar) => {
            const active = calendarMode === calendar;
            return (
              <button
                key={String(calendar)}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(calendar)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {t(calendar ? 'sorties.mode_calendar' : 'sorties.mode_list')}
              </button>
            );
          })}
        </div>
      </div>

      {calendarMode ? (
        <>
          <div style={{ padding: '0 16px' }}>
            <EventsCalendar
              slots={filteredSlots}
              selectedDay={selectedDay}
              onSelectDay={(day) => {
                setSelectedDay(day);
                setDayTouched(true);
              }}
              expanded={monthExpanded}
              onExpandedChange={setMonthExpanded}
            />
          </div>

          {/* Événements au long cours couvrant le jour — hors grille, sinon une
              expo de deux mois pose une pastille sur soixante cases. */}
          {dayLongEvents.length > 0 && (
            <div style={{ padding: '14px 16px 0' }}>
              <div
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('sorties.happening_now')}
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {dayLongEvents.map((ev) => {
                  const hex = eventCategoryHex(ev.category);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => navigate(`/event/${ev.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                        padding: '6px 10px',
                        borderRadius: 999,
                        cursor: 'pointer',
                        background: `${hex}1A`,
                        border: `1px solid ${hex}73`,
                        color: hex,
                        fontFamily: 'DM Sans',
                        fontSize: 12,
                      }}
                    >
                      <span aria-hidden>{eventCategoryEmoji(ev.category)}</span>
                      {ev.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'Caveat', fontSize: 19, fontWeight: 600, color: 'var(--text)' }}>
              {dayTitle}
            </span>
            {daySlots.length > 0 && (
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
                · {t('sorties.count', { count: daySlots.length })}
              </span>
            )}
          </div>

          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {daySlots.length === 0 && !isLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)' }}>
                  {t('sorties.empty_day')}
                </div>
                <div style={{ fontFamily: 'Caveat', fontSize: 16, color: 'var(--text-muted)', marginTop: 6 }}>
                  {t('sorties.empty_day_hint')}
                </div>
              </div>
            ) : (
              daySlots.map((slot) => (
                <EventCard
                  key={slot.occurrence.id}
                  event={slot.event}
                  occurrence={slot.occurrence}
                  showPast={selectedDay <= today}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <WeekendPicker weekends={localizedWeeks} selectedKey={selectedKey} onChange={setSelectedKey} />

          <div style={{ padding: '8px 16px' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {isLoading
                ? t('common.loading')
                : t('sorties.count', { count: displayedSlots.length, defaultValue: `${displayedSlots.length} événements` })}
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
            {displayedSlots.length === 0 && !isLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>🎪</div>
                <div style={{ fontFamily: 'Caveat', fontSize: 17, color: 'var(--text-muted)' }}>
                  {hasActiveFilter ? t('sorties.empty_filtered') : t('sorties.empty')}
                </div>
              </div>
            ) : (
              displayedSlots.map((slot) => (
                <EventCard
                  key={slot.occurrence.id}
                  event={slot.event}
                  occurrence={slot.occurrence}
                  showPast={showPast}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SortiesPage;
