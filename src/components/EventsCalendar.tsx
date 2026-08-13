import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { EventItem, eventCategoryHex } from '@/types/event';
import { todayISO } from '@/lib/weekend';
import {
  addDaysISO,
  adjacentPopulated,
  dateFromISO,
  firstEventDay,
  monthEndISO,
  monthGridCells,
  monthStartISO,
  mondayISO,
  populatedMonths,
  populatedWeeks,
  shortEventsByDay,
} from '@/lib/eventCalendar';
import { localeOf } from '@/lib/formatDate';

interface Props {
  /** Événements déjà filtrés (âge + catégorie). */
  events: EventItem[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

/**
 * Calendrier des Sorties, en deux états : un bandeau d'une semaine (replié) ou
 * la grille du mois (déplié). Miroir de `SortiesView.swift` côté iOS.
 */
const EventsCalendar = ({ events, selectedDay, onSelectDay, expanded, onExpandedChange }: Props) => {
  const { t, i18n } = useTranslation();
  const byDay = useMemo(() => shortEventsByDay(events), [events]);
  const months = useMemo(() => populatedMonths(events), [events]);
  const weeks = useMemo(() => populatedWeeks(events), [events]);
  const today = todayISO();

  const currentStart = expanded ? monthStartISO(selectedDay) : mondayISO(selectedDay);
  const periods = expanded ? months : weeks;
  const prev = adjacentPopulated(periods, currentStart, false);
  const next = adjacentPopulated(periods, currentStart, true);

  /** On se pose sur le premier jour porteur d'événements de la période visée. */
  const step = (periodStart: string | null) => {
    if (!periodStart) return;
    const end = expanded ? monthEndISO(periodStart) : addDaysISO(periodStart, 6);
    onSelectDay(firstEventDay(byDay, periodStart, end) ?? periodStart);
  };

  const monthLabel = useMemo(() => {
    const s = dateFromISO(selectedDay).toLocaleDateString(localeOf(i18n.language), {
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [selectedDay, i18n.language]);

  /** Initiales des jours, lundi en premier, dans la langue courante. */
  const weekdayInitials = useMemo(() => {
    const locale = localeOf(i18n.language);
    // 2024-01-01 est un lundi : point de départ arbitraire mais sûr.
    return Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }).toUpperCase(),
    );
  }, [i18n.language]);

  const weekDays = useMemo(() => {
    const monday = mondayISO(selectedDay);
    return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  }, [selectedDay]);

  const cells = useMemo(() => monthGridCells(selectedDay), [selectedDay]);

  // Glissement vertical sur la poignée, accepté comme le tap (parité iOS).
  const dragStartY = useRef<number | null>(null);

  const dayCell = (day: string | null, key: string, weekdayInitial?: string) => {
    if (!day) return <div key={key} />;
    const dayEvents = byDay[day] ?? [];
    const isSelected = day === selectedDay;
    const isToday = day === today;
    const isPast = day < today;
    const dayNumber = Number(day.slice(8, 10));
    const label = dateFromISO(day).toLocaleDateString(localeOf(i18n.language), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return (
      <button
        key={key}
        type="button"
        onClick={() => onSelectDay(day)}
        aria-pressed={isSelected}
        aria-label={
          dayEvents.length > 0 ? `${label}, ${t('sorties.count', { count: dayEvents.length })}` : label
        }
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '5px 0',
          minHeight: 44,
          borderRadius: 9,
          cursor: 'pointer',
          background: isSelected ? 'var(--primary)' : 'transparent',
          // Bordure toujours posée (transparente hors « aujourd'hui ») pour que
          // la case ne change pas de taille selon le jour.
          border: `1.5px solid ${isToday && !isSelected ? 'var(--primary-mid)' : 'transparent'}`,
          opacity: isPast && !isSelected ? 0.4 : 1,
        }}
      >
        {weekdayInitial && (
          <span
            style={{
              fontFamily: 'DM Sans',
              fontSize: 10,
              fontWeight: 600,
              color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
            }}
          >
            {weekdayInitial}
          </span>
        )}
        <span
          style={{
            fontFamily: 'DM Sans',
            fontSize: 13,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? '#fff' : 'var(--text)',
          }}
        >
          {dayNumber}
        </span>
        <span style={{ display: 'flex', gap: 2, alignItems: 'center', height: 6 }}>
          {dayEvents.slice(0, 3).map((ev, i) => (
            <span
              key={`${ev.id}-${i}`}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isSelected ? '#fff' : eventCategoryHex(ev.category),
              }}
            />
          ))}
          {dayEvents.length > 3 && (
            <span
              style={{
                fontFamily: 'DM Sans',
                fontSize: 9,
                fontWeight: 600,
                color: isSelected ? '#fff' : 'var(--text-muted)',
              }}
            >
              +
            </span>
          )}
        </span>
      </button>
    );
  };

  const arrow = (direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? prev : next;
    const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        onClick={() => step(target)}
        disabled={!target}
        aria-label={t(direction === 'prev' ? 'sorties.calendar_prev' : 'sorties.calendar_next')}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-muted)',
          cursor: target ? 'pointer' : 'default',
          opacity: target ? 1 : 0.25,
        }}
      >
        <Icon size={18} />
      </button>
    );
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px 2px' }}>
        {arrow('prev')}
        <span style={{ fontFamily: 'Fraunces', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>
          {monthLabel}
        </span>
        {arrow('next')}
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 6px 2px' }}>
          {weekdayInitials.map((initial, i) => (
            <div
              key={`wd-${i}`}
              style={{
                textAlign: 'center',
                fontFamily: 'DM Sans',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              {initial}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 6px 8px' }}>
        {expanded
          ? cells.map((day, i) => dayCell(day, `cell-${i}`))
          : weekDays.map((day, i) => dayCell(day, `wk-${i}`, weekdayInitials[i]))}
      </div>

      {/* Poignée pleine largeur : cible tactile généreuse, teinte primaire pour
          se lire comme interactive, et glissement vertical accepté comme le clic. */}
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        onPointerDown={(e) => {
          dragStartY.current = e.clientY;
        }}
        onPointerUp={(e) => {
          const start = dragStartY.current;
          dragStartY.current = null;
          if (start === null) return;
          const dy = e.clientY - start;
          if (dy > 12) onExpandedChange(true);
          else if (dy < -12) onExpandedChange(false);
        }}
        aria-expanded={expanded}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 0',
          background: 'var(--primary-light)',
          border: 'none',
          borderTop: '1px solid var(--border)',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        <span style={{ width: 26, height: 3, borderRadius: 2, background: 'var(--primary-mid)' }} />
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
          {expanded ? t('sorties.collapse') : t('sorties.see_month')}
        </span>
        {expanded ? (
          <ChevronUp size={16} color="var(--primary)" />
        ) : (
          <ChevronDown size={16} color="var(--primary)" />
        )}
        <span style={{ width: 26, height: 3, borderRadius: 2, background: 'var(--primary-mid)' }} />
      </button>
    </div>
  );
};

export default EventsCalendar;
