import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, CalendarPlus, Check, MapPin, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSpotlight, type ActiveSpotlight } from '@/hooks/useActiveSpotlight';
import { useHasBlockingOverlay } from '@/hooks/useBlockingOverlays';
import {
  EMPTY_SPOTLIGHT_STATE,
  countdownOf,
  decideSpotlight,
  readSpotlightState,
  recordAction,
  recordShown,
  writeSpotlightState,
  type SpotlightState,
} from '@/lib/eventSpotlight';
import { dateFromISO } from '@/lib/eventCalendar';
import { formatAgeRangeI18n } from '@/lib/ageFormat';
import { localeOf } from '@/lib/formatDate';
import { downloadIcs } from '@/lib/ics';
import { supabaseResized, onResizedImageError } from '@/lib/imageUrl';
import { logSpotlight } from '@/lib/spotlightLog';
import { translateToken } from '@/i18n/tokenMaps';
import { eventCategoryHex } from '@/types/event';

/** Délai après le chargement de la liste : la pop-in ne doit jamais gêner l'arrivée. */
const SHOW_DELAY_MS = 1500;

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

interface Props {
  /** La liste de l'accueil est chargée. */
  ready: boolean;
  /** Une autre fenêtre de l'accueil est ouverte (assistant, filtres, visite guidée, proposition…). */
  blocked: boolean;
}

const dayLabel = (iso: string) =>
  dateFromISO(iso).toLocaleDateString(localeOf(), { weekday: 'short', day: 'numeric', month: 'short' });
const dayShort = (iso: string) =>
  dateFromISO(iso).toLocaleDateString(localeOf(), { day: 'numeric', month: 'short' });

const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Pop-in « À la une » : une sortie mise en avant depuis l'admin, en feuille du bas.
 * Elle attend 1,5 s après le chargement de la liste, jamais devant une autre fenêtre : dans ce
 * cas elle laisse sa place et reviendra à l'ouverture suivante. Toute la règle de fréquence est
 * dans `lib/eventSpotlight`.
 */
const EventSpotlightSheet = ({ ready, blocked }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: active } = useActiveSpotlight();
  const overlayBlocked = useHasBlockingOverlay();

  const [open, setOpen] = useState(false);
  const [isLast, setIsLast] = useState(false);
  const [daysUntil, setDaysUntil] = useState(0);
  const [alreadyInCalendar, setAlreadyInCalendar] = useState(false);
  const [addedNow, setAddedNow] = useState(false);

  const evaluated = useRef(false);
  const blockedRef = useRef(false);
  blockedRef.current = blocked || overlayBlocked;
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  const stateRef = useRef<SpotlightState>(EMPTY_SPOTLIGHT_STATE);
  const actedThisTime = useRef(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ready || authLoading || !active || evaluated.current) return;
    const timer = setTimeout(() => {
      if (evaluated.current) return;
      evaluated.current = true;
      if (blockedRef.current) return;
      const now = new Date();
      const stored = readSpotlightState(active.rule.id);
      const decision = decideSpotlight(now, active.rule, active.eventDay, stored);
      if (!decision.show) return;
      const next = recordShown(stored, now, decision.isLast);
      writeSpotlightState(active.rule.id, next);
      stateRef.current = next;
      actedThisTime.current = false;
      returnFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setIsLast(decision.isLast);
      setDaysUntil(decision.daysUntil);
      setAlreadyInCalendar(stored.calendar);
      setAddedNow(false);
      setOpen(true);
      logSpotlight({ spotlightId: active.rule.id, kind: 'shown', isLast: decision.isLast, userId: userIdRef.current });
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ready, authLoading, active]);

  const close = useCallback(
    (dismissed: boolean) => {
      if (dismissed && active && !actedThisTime.current) {
        logSpotlight({ spotlightId: active.rule.id, kind: 'dismiss', isLast, userId: userIdRef.current });
      }
      setOpen(false);
      returnFocusTo.current?.focus?.();
    },
    [active, isLast],
  );

  // Focus dans la fenêtre à l'ouverture, Échap pour fermer, Tab qui ne sort pas, page figée derrière.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  if (!open || !active) return null;

  const spot: ActiveSpotlight = active;
  const { event, occurrence } = spot;
  const color = eventCategoryHex(event.category);
  const hasPhoto = spot.showPhoto && !!event.photo;

  const start = occurrence?.date_start ?? event.date_start;
  const end = occurrence ? occurrence.date_end : event.date_end;
  const time = (occurrence ? occurrence.time : event.time)?.slice(0, 5) ?? null;
  const dateLine = end && end !== start
    ? t('spotlight.date_range', { start: dayShort(start), end: dayShort(end) })
    : `${capFirst(dayLabel(start))}${time ? ` · ${time}` : ''}`;
  const placeLine = [
    event.address,
    formatAgeRangeI18n(t, event.age_min_months, event.age_max_months),
    event.price ? translateToken('price', event.price) : null,
  ].filter(Boolean).join(' · ');

  const countdown = countdownOf(daysUntil);
  const label = !isLast
    ? t('spotlight.label')
    : countdown.kind === 'today'
      ? t('spotlight.countdown_today')
      : countdown.kind === 'tomorrow'
        ? t('spotlight.countdown_tomorrow')
        : t('spotlight.countdown_days', { count: countdown.count });

  const act = (kind: 'open' | 'calendar') => {
    actedThisTime.current = true;
    const next = recordAction(stateRef.current, kind);
    stateRef.current = next;
    writeSpotlightState(spot.rule.id, next);
    logSpotlight({ spotlightId: spot.rule.id, kind, isLast, userId: userIdRef.current });
  };

  const onSee = () => {
    act('open');
    setOpen(false);
    navigate(`/event/${event.id}`);
  };

  const onCalendar = () => {
    if (alreadyInCalendar || addedNow) return;
    // Le fichier part avec les dates du créneau à venir, pas celles du premier créneau de la série.
    downloadIcs(occurrence ? { ...event, date_start: occurrence.date_start, date_end: occurrence.date_end, time: occurrence.time } : event);
    act('calendar');
    setAddedNow(true);
  };

  const calendarDone = alreadyInCalendar || addedNow;

  return (
    <div onClick={() => close(true)} style={overlay}>
      <style>{`
        @keyframes spotlightUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .spotlight-sheet { animation: spotlightUp .32s cubic-bezier(.2,.8,.2,1); }
        @media (prefers-reduced-motion: reduce) { .spotlight-sheet { animation: none; } }
        .spotlight-sheet:focus { outline: none; }
      `}</style>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-headline"
        tabIndex={-1}
        className="spotlight-sheet"
        onClick={(e) => e.stopPropagation()}
        style={sheet}
      >
        <div
          style={{
            position: 'relative', flex: 'none', height: hasPhoto ? 128 : 44,
            background: `radial-gradient(circle at 18% 120%, rgba(255,255,255,.35) 0 38%, transparent 39%), radial-gradient(circle at 92% -10%, rgba(255,255,255,.28) 0 30%, transparent 31%), linear-gradient(160deg, color-mix(in srgb, ${color} 82%, #fff), ${color})`,
          }}
        >
          {hasPhoto && (
            <img
              src={supabaseResized(event.photo as string, { width: 960, height: 256, quality: 75 })}
              onError={onResizedImageError(event.photo as string)}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <button
            type="button"
            onClick={() => close(true)}
            aria-label={t('spotlight.close')}
            style={{
              position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.92)', color: '#1C1917', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        <div style={{ padding: '12px 18px calc(env(safe-area-inset-bottom, 0px) + 14px)', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <p style={{ margin: 0, fontFamily: 'Caveat', fontWeight: 600, fontSize: 22, lineHeight: 1, color: 'var(--primary)' }}>{label}</p>
          <h2 id="spotlight-headline" style={{ margin: 0, fontFamily: 'Fraunces', fontWeight: 500, fontSize: 21, lineHeight: 1.18, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {spot.headline}
          </h2>
          {spot.message && (
            <p style={{ margin: 0, fontFamily: 'DM Sans', fontSize: 14, lineHeight: 1.45, color: 'var(--text)', opacity: 0.82 }}>{spot.message}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 10px' }}>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />
              {event.name}
            </p>
            <p style={metaLine}>
              <CalendarDays size={13} aria-hidden style={metaIcon} />
              <span>{dateLine}</span>
            </p>
            {placeLine && (
              <p style={metaLine}>
                <MapPin size={13} aria-hidden style={metaIcon} />
                <span>{placeLine}</span>
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            <button type="button" onClick={onSee} style={{ ...btn, background: 'var(--primary)', color: '#fff', border: 'none' }}>
              {t('spotlight.see_event')}
              <ArrowRight size={16} aria-hidden />
            </button>
            {spot.showCalendarCta && (
              <button
                type="button"
                onClick={onCalendar}
                aria-disabled={calendarDone}
                style={{
                  ...btn,
                  background: calendarDone ? 'var(--secondary-light)' : 'var(--surface)',
                  color: 'var(--secondary)',
                  border: calendarDone ? '1.5px solid transparent' : '1.5px solid var(--secondary)',
                  cursor: calendarDone ? 'default' : 'pointer',
                }}
              >
                {calendarDone ? <Check size={16} aria-hidden /> : <CalendarPlus size={16} aria-hidden />}
                {addedNow ? t('spotlight.added_to_calendar') : alreadyInCalendar ? t('spotlight.already_in_calendar') : t('spotlight.add_to_calendar')}
              </button>
            )}
            <button
              type="button"
              onClick={() => close(true)}
              style={{ minHeight: 40, border: 'none', background: 'none', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {t('spotlight.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(28,25,23,0.52)', zIndex: 1700,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 480, maxHeight: '92vh', display: 'flex', flexDirection: 'column',
  background: 'var(--surface)', borderRadius: '24px 24px 0 0', overflow: 'hidden',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
};

const btn: React.CSSProperties = {
  minHeight: 46, borderRadius: 999, fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
};

const metaLine: React.CSSProperties = {
  margin: 0, display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: 'DM Sans', fontSize: 12.5, color: 'var(--text-muted)',
};
const metaIcon: React.CSSProperties = { flex: 'none', marginTop: 2 };

export default EventSpotlightSheet;
