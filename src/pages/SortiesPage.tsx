import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronsUpDown, List, Map as MapIcon } from 'lucide-react';
import { FilterChip, FiltersButton } from '@/components/FilterParts';
import { segmentStyle } from '@/lib/segmentStyle';
import Header from '@/components/Header';
import EventsMap from '@/components/EventsMap';
import EventsCalendar from '@/components/EventsCalendar';
import EventDayCard from '@/components/EventDayCard';
import SortiesAssistant, { SortiesAssistantOutcome } from '@/components/SortiesAssistant';
import SortiesFiltersSheet from '@/components/SortiesFiltersSheet';
import { MascotteMiniature } from '@/components/Mascotte';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { orderEventCategories } from '@/components/EventCategoryFilter';
import { useProximityZone } from '@/hooks/useProximityZone';
import { eventFarInfo } from '@/lib/proximity';
import { useEvents, useEventOccurrences } from '@/hooks/useEvents';
import { AGE_LABEL_KEY, ChildAgeBucket, bucketForChildMonths } from '@/lib/ageFilter';
import { useChildren } from '@/hooks/useChildren';
import { Child, ageInMonths } from '@/lib/children';
import { localeOf } from '@/lib/formatDate';
import { addDaysISO, dateFromISO, defaultSelectedDay, longBarsForRow, mondayISO, firstEventDay, shortSlotsByDay } from '@/lib/eventCalendar';
import { EventItem, eventCategoryEmoji, eventCategoryHex } from '@/types/event';
import { translateToken } from '@/i18n/tokenMaps';
import {
  DAY_MOMENTS,
  WHEN_SHORTCUTS,
  buildDayGroups,
  countSorties,
  filterSlots,
  longEventsInRange,
  sameWhen,
  whenDays,
  type DayMoment,
  type EventCriteria,
  type EventSortMode,
  type MomentSection,
  type SortiesWhen,
} from '@/lib/sortiesFilters';

const AGE_BAND_KEY = 'sorties.ageBand';
const SHOW_MAP_KEY = 'sorties.showMap';
const VALID_AGES = new Set<string>(['0-2', '3-5', '6+']);

const readStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : le réglage reste pour la session.
  }
};

const WHEN_LABEL_KEY: Record<Exclude<SortiesWhen['kind'], 'day'>, string> = {
  today: 'sorties.when_today',
  tomorrow: 'sorties.when_tomorrow',
  weekend: 'sorties.when_weekend',
  week: 'sorties.when_week',
};
const PERIOD_LABEL_KEY: Record<Exclude<SortiesWhen['kind'], 'day'>, string> = {
  today: 'sorties.period_today',
  tomorrow: 'sorties.period_tomorrow',
  weekend: 'sorties.period_weekend',
  week: 'sorties.period_week',
};

/**
 * Onglet Sorties : période (Auj. · Demain · Week-end · Semaine · 📅), une seule
 * rangée de filtres, puis la liste par jour et par moment. Miroir de
 * `SortiesView.swift` (iOS) et `sorties_screen.dart` (Android).
 */
const SortiesPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const zone = useProximityZone();
  const isNear = useMemo(() => (e: EventItem) => eventFarInfo(zone, e) === null, [zone]);
  const { children: kids, selection: childSelection, setSelection: setChildSelection, resolvedBuckets, requestHookIfNeeded } = useChildren();

  // Tranche unique sans profil famille, persistée comme avant.
  const [ageBucket, setAgeBucketState] = useState<ChildAgeBucket | null>(() => {
    const stored = readStorage(AGE_BAND_KEY);
    return stored && VALID_AGES.has(stored) ? (stored as ChildAgeBucket) : null;
  });
  // Le hook « enregistrez vos enfants » se déclenche au premier filtre d'âge,
  // sauf quand c'est l'assistant qui vient de le poser : enchaîner sa fermeture
  // avec une feuille ferait deux écrans d'affilée.
  const setAgeBucket = (b: ChildAgeBucket | null, offerHook = true) => {
    setAgeBucketState(b);
    writeStorage(AGE_BAND_KEY, b);
    if (b && offerHook) requestHookIfNeeded();
  };
  const ageBuckets = useMemo<Set<ChildAgeBucket>>(
    () => (kids.length > 0 ? resolvedBuckets : ageBucket ? new Set([ageBucket]) : new Set()),
    [kids.length, resolvedBuckets, ageBucket],
  );

  const [when, setWhen] = useState<SortiesWhen>({ kind: 'today' });
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [moments, setMoments] = useState<Set<DayMoment>>(new Set());
  const [onlyFree, setOnlyFree] = useState(false);
  const [onlyNearby, setOnlyNearby] = useState(false);
  const [sortMode, setSortMode] = useState<EventSortMode>('heure');
  const [monthExpanded, setMonthExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // La carte n'occupe plus l'écran en permanence : elle s'affiche à la demande,
  // et ce choix est retenu d'une session à l'autre.
  const [showMap, setShowMapState] = useState(() => readStorage(SHOW_MAP_KEY) === '1');
  const setShowMap = (v: boolean) => {
    setShowMapState(v);
    writeStorage(SHOW_MAP_KEY, v ? '1' : '0');
  };

  const { data: events = [], isLoading } = useEvents();
  const eventIds = useMemo(() => events.map((ev) => ev.id), [events]);
  const { data: occurrencesByEvent = {} } = useEventOccurrences(eventIds);

  const days = useMemo(() => whenDays(when), [when]);
  const criteria = useMemo<EventCriteria>(
    () => ({ days, ageBuckets, categories, moments, onlyFree, onlyNearby }),
    [days, ageBuckets, categories, moments, onlyFree, onlyNearby],
  );
  const count = useCallback(
    (c: EventCriteria) => countSorties(events, occurrencesByEvent, c, isNear),
    [events, occurrencesByEvent, isNear],
  );

  // Créneaux passant tous les filtres sauf la période : base de la liste et du calendrier.
  const slots = useMemo(() => filterSlots(events, occurrencesByEvent, criteria, isNear), [events, occurrencesByEvent, criteria, isNear]);
  const groups = useMemo(() => buildDayGroups(slots, days, sortMode), [slots, days, sortMode]);
  const selectedDay = when.kind === 'day' ? when.date : days[0];
  // En vue calendrier, les sorties longues déjà dessinées en barres n'ont pas à
  // revenir dans la bande « En ce moment » : seules restent celles du « +N ».
  const drawnLongIds = useMemo(() => {
    if (when.kind !== 'day') return new Set<string>();
    const row = longBarsForRow(slots, mondayISO(selectedDay), selectedDay, monthExpanded);
    return new Set(row.bars.map((b) => b.slot.event.id));
  }, [when.kind, slots, selectedDay, monthExpanded]);
  const longs = useMemo(() => longEventsInRange(slots, days).filter((e) => !drawnLongIds.has(e.id)), [slots, days, drawnLongIds]);
  const total = useMemo(() => count(criteria), [count, criteria]);

  const availableCategories = useMemo(
    () => orderEventCategories(Array.from(new Set(events.map((e) => e.category).filter(Boolean) as string[]))),
    [events],
  );

  const mapEvents = useMemo(() => {
    const seen = new Set<string>();
    const all = [...groups.flatMap((g) => g.sections.flatMap((s) => s.cards.map((c) => c.slot.event))), ...longs];
    return all.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  }, [groups, longs]);

  const locale = localeOf(i18n.language);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const dayTitle = (iso: string) => cap(dateFromISO(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }));
  const shortDay = (iso: string) => cap(dateFromISO(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' }));
  const periodLabel = (w: SortiesWhen) =>
    w.kind === 'day'
      ? cap(dateFromISO(w.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }))
      : t(PERIOD_LABEL_KEY[w.kind]);

  const selectDay = (iso: string) => setWhen({ kind: 'day', date: iso });

  const toggleIn = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set);
    if (!next.delete(v)) next.add(v);
    return next;
  };

  const childLabel = (child: Child): string => {
    const name = child.first_name?.trim();
    const months = ageInMonths(child);
    if (!name) return t(AGE_LABEL_KEY[bucketForChildMonths(months)]);
    const age = months < 24 ? t('common.age_in_months', { age: months }) : t('common.age_in_years', { age: Math.round(months / 12) });
    return `${name} · ${age}`;
  };
  const isChildOn = (child: Child) =>
    childSelection.kind === 'allChildren' || (childSelection.kind === 'child' && childSelection.id === child.id);
  /**
   * Deux enfants : chaque pastille s'ajoute ou se retire (les deux = « Tous mes
   * enfants »). Au-delà, la sélection partagée ne sait dire qu'un enfant ou
   * tous : une pastille touchée devient la seule sélectionnée.
   */
  const toggleChild = (child: Child) => {
    if (childSelection.kind === 'none') return setChildSelection({ kind: 'child', id: child.id });
    if (childSelection.kind === 'child') {
      if (childSelection.id === child.id) return setChildSelection({ kind: 'none' });
      return setChildSelection(kids.length === 2 ? { kind: 'allChildren' } : { kind: 'child', id: child.id });
    }
    const other = kids.find((k) => k.id !== child.id);
    setChildSelection(kids.length === 2 && other ? { kind: 'child', id: other.id } : { kind: 'child', id: child.id });
  };

  const activeCount =
    (kids.length > 0 ? (childSelection.kind === 'none' ? 0 : 1) : ageBucket ? 1 : 0) +
    categories.size + moments.size + (onlyFree ? 1 : 0) + (onlyNearby ? 1 : 0);

  const clearAll = () => {
    if (kids.length > 0) setChildSelection({ kind: 'none' });
    else setAgeBucket(null);
    setCategories(new Set());
    setMoments(new Set());
    setOnlyFree(false);
    setOnlyNearby(false);
  };

  /** L'assistant ne pose que des filtres visibles dans la barre, défaisables d'un tap. */
  const applyOutcome = (o: SortiesAssistantOutcome) => {
    setWhen(o.when);
    if (o.childSelection) setChildSelection(o.childSelection);
    else if (kids.length > 0) setChildSelection({ kind: 'none' });
    else setAgeBucket(o.ageBuckets.size === 1 ? [...o.ageBuckets][0] : null, false);
    setCategories(o.categories);
    setMoments(o.moments);
    setOnlyFree(o.onlyFree);
    setOnlyNearby(o.onlyNearby);
    setShowMap(false);
    setAssistantOpen(false);
  };

  // Pour chaque filtre actif, ce qu'on obtiendrait en le retirant — puis les
  // autres périodes avec les mêmes filtres. Seules les pistes non vides restent.
  // Pas mémoïsé : calculé seulement quand la liste est vide, et ses actions
  // doivent voir les setters du rendu courant, pas ceux d'un rendu précédent.
  const buildRelaxers = () => {
    const out: { id: string; label: string; count: number; apply: () => void }[] = [];
    const add = (id: string, label: string, patch: Partial<EventCriteria>, apply: () => void) => {
      const n = count({ ...criteria, ...patch });
      if (n > 0) out.push({ id, label, count: n, apply });
    };
    if (categories.size) add('cat', t('sorties.relax_categories'), { categories: new Set() }, () => setCategories(new Set()));
    if (moments.size) add('moment', t('sorties.relax_moments'), { moments: new Set() }, () => setMoments(new Set()));
    if (ageBuckets.size) {
      add('age', t('sorties.relax_ages'), { ageBuckets: new Set() }, () =>
        kids.length > 0 ? setChildSelection({ kind: 'none' }) : setAgeBucket(null),
      );
    }
    if (onlyFree) add('free', t('sorties.relax_free'), { onlyFree: false }, () => setOnlyFree(false));
    if (onlyNearby) add('near', t('sorties.relax_nearby'), { onlyNearby: false }, () => setOnlyNearby(false));
    for (const w of WHEN_SHORTCUTS) {
      if (sameWhen(w, when)) continue;
      add(`when-${w.kind}`, t('sorties.relax_period', { period: periodLabel(w) }), { days: whenDays(w) }, () => setWhen(w));
    }
    return out;
  };

  const sectionTitle = (s: MomentSection) =>
    s.moment
      ? t(`sorties.section_${s.moment}`)
      : sortMode === 'aimes'
        ? t('sorties.section_aimes')
        : sortMode === 'recents'
          ? t('sorties.section_recents')
          : t('sorties.section_none');

  const segStyle = segmentStyle;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <Header onOpenAssistant={() => setAssistantOpen(true)} />

      <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          🎈 {t('sorties.title_nantes')}
        </h1>

        {/* Période. Le dernier segment affiche le jour choisi dans le calendrier,
            pour que la période soit toujours lisible. */}
        <div role="tablist" aria-label={t('sorties.view_mode')} style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--border)', borderRadius: 999 }}>
          {WHEN_SHORTCUTS.map((w) => {
            const active = sameWhen(w, when);
            return (
              <button key={w.kind} type="button" role="tab" aria-selected={active} onClick={() => setWhen(w)} style={segStyle(active)}>
                {t(WHEN_LABEL_KEY[w.kind as Exclude<SortiesWhen['kind'], 'day'>])}
              </button>
            );
          })}
          <button
            type="button"
            role="tab"
            aria-selected={when.kind === 'day'}
            aria-label={t('sorties.pick_date')}
            onClick={() => {
              if (when.kind !== 'day') selectDay(defaultSelectedDay(shortSlotsByDay(slots)));
            }}
            style={{ ...segStyle(when.kind === 'day'), flex: 'none', minWidth: 40, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {when.kind === 'day' ? shortDay(when.date) : <CalendarDays size={15} aria-hidden />}
          </button>
        </div>

        {/* Une seule rangée : le bouton Filtres, les filtres qu'on touche le plus
            (enfants, Gratuit), puis chaque autre filtre actif avec sa croix. */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
          <FiltersButton label={t('sorties.filters')} count={activeCount} onClick={() => setFiltersOpen(true)} />
          {kids.length > 0
            ? kids.map((child) => (
                <FilterChip key={child.id} label={childLabel(child)} on={isChildOn(child)} onClick={() => toggleChild(child)} removeLabel={t('sorties.remove_filter')} />
              ))
            : ageBucket && (
                <FilterChip label={t(AGE_LABEL_KEY[ageBucket])} on removable onClick={() => setAgeBucket(null)} removeLabel={t('sorties.remove_filter')} />
              )}
          <FilterChip label={t('sorties.free')} on={onlyFree} onClick={() => setOnlyFree((v) => !v)} removeLabel={t('sorties.remove_filter')} />
          {[...availableCategories.filter((c) => categories.has(c)), ...[...categories].filter((c) => !availableCategories.includes(c))].map((cat) => (
            <FilterChip
              key={cat}
              label={`${eventCategoryEmoji(cat)} ${translateToken('category_event', cat)}`}
              on
              removable
              onClick={() => setCategories((s) => toggleIn(s, cat))}
              removeLabel={t('sorties.remove_filter')}
            />
          ))}
          {DAY_MOMENTS.filter((m) => moments.has(m)).map((m) => (
            <FilterChip key={m} label={t(`sorties.moment_${m}`)} on removable onClick={() => setMoments((s) => toggleIn(s, m))} removeLabel={t('sorties.remove_filter')} />
          ))}
          {onlyNearby && (
            <FilterChip label={t('sorties.nearby')} on removable onClick={() => setOnlyNearby(false)} removeLabel={t('sorties.remove_filter')} />
          )}
        </div>
      </div>

      {/* Ligne du compteur : résumé, tri (même menu qu'Explorer, au même endroit), carte. */}
      <div style={{ marginTop: 10, padding: '6px 12px 6px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'Caveat', fontSize: 20, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isLoading ? t('common.loading') : `${periodLabel(when)} · ${t('sorties.total', { count: total })}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1 text-sm font-medium shrink-0"
              style={{ minHeight: 36, padding: '0 6px', color: sortMode === 'heure' ? 'var(--text-muted)' : 'var(--primary)' }}
              aria-label={t('sorties.sort')}
            >
              {t(`sorties.sort_${sortMode}`)}
              <ChevronsUpDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(['heure', 'aimes', 'recents'] as const).map((mode) => (
              <DropdownMenuItem key={mode} onSelect={() => setSortMode(mode)} className={sortMode === mode ? 'font-semibold' : undefined}>
                {t(`sorties.sort_${mode}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          aria-label={showMap ? t('sorties.show_list') : t('sorties.show_map')}
          style={{ width: 40, height: 36, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
        >
          {showMap ? <List size={16} aria-hidden /> : <MapIcon size={16} aria-hidden />}
        </button>
      </div>

      {when.kind === 'day' && (
        <div style={{ padding: '6px 16px 0' }}>
          <EventsCalendar
            slots={slots}
            selectedDay={selectedDay}
            onSelectDay={selectDay}
            expanded={monthExpanded}
            onExpandedChange={setMonthExpanded}
            onOpenEvent={(id) => navigate(`/event/${id}`)}
            // « +N » : les sorties longues sans barre sont listées sous le
            // calendrier, dans « En ce moment » — on se pose sur la semaine.
            onShowWeekInList={(monday) => selectDay(firstEventDay(shortSlotsByDay(slots), monday, addDaysISO(monday, 6)) ?? monday)}
          />
        </div>
      )}

      {showMap && (
        <div style={{ margin: '8px 16px 0', borderRadius: 'var(--radius)', overflow: 'hidden', height: 300, isolation: 'isolate', zIndex: 0 }}>
          <EventsMap events={mapEvents} />
        </div>
      )}

      {!isLoading && groups.length === 0 && longs.length === 0 ? (
        <div style={{ padding: '22px 16px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <MascotteMiniature size={64} />
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>{t('sorties.nothing_title')}</p>
          <p style={{ fontFamily: 'Caveat', fontSize: 17, color: 'var(--text-muted)' }}>{t('sorties.nothing_hint')}</p>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {buildRelaxers().map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={r.apply}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, padding: '0 14px', cursor: 'pointer',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                  fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500, color: 'var(--text)', textAlign: 'left',
                }}
              >
                {r.label}
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--secondary)', background: 'var(--secondary-light)', borderRadius: 999, padding: '3px 9px' }}>
                  {t('sorties.total', { count: r.count })}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 16px 32px' }}>
          {longs.length > 0 && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                {t('sorties.happening_now')}
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {longs.map((ev) => {
                  const hex = eventCategoryHex(ev.category);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => navigate(`/event/${ev.id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
                        background: `${hex}1A`, border: `1px solid ${hex}73`, color: hex, fontFamily: 'DM Sans', fontSize: 12,
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
          {groups.map((group) => (
            <div key={group.day}>
              {groups.length > 1 && (
                <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginTop: 18 }}>{dayTitle(group.day)}</h2>
              )}
              {group.sections.map((section) => (
                <div key={section.moment ?? 'none'}>
                  <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '12px 0 8px' }}>
                    {sectionTitle(section)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {section.cards.map((card) => (
                      <EventDayCard key={`${card.slot.event.id}|${card.day}`} card={card} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <SortiesFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        criteria={criteria}
        count={count}
        availableCategories={availableCategories}
        kids={kids}
        childSelection={childSelection}
        onChildSelection={setChildSelection}
        ageBucket={ageBucket}
        onAgeBucket={setAgeBucket}
        onToggleCategory={(cat) => setCategories((s) => toggleIn(s, cat))}
        onToggleMoment={(m) => setMoments((s) => toggleIn(s, m))}
        onlyFree={onlyFree}
        onFree={setOnlyFree}
        onlyNearby={onlyNearby}
        onNearby={setOnlyNearby}
        onClearAll={clearAll}
      />

      <SortiesAssistant
        open={assistantOpen}
        kids={kids}
        count={count}
        onFinish={applyOutcome}
        onSkip={() => setAssistantOpen(false)}
      />
    </div>
  );
};

export default SortiesPage;
