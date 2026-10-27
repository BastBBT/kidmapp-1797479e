import { useMemo, useState } from 'react';
import { categoryLabels } from '@/types/location';
import { useOutboundClicks } from '@/hooks/useOutboundClicks';
import {
  addDays, buildWeeks, countClicks, dayMonth, deltaPct, entityIdsClicked, isCurrentWeek, previousWindow,
  rankClicks, trendByKey, weekLabel, type ClickGroup, type ClickRow, type RankedRow, type Week,
} from './outboundWeeks';

const WEEKS_SHOWN = 8;
const TREND_WEEKS = 4;
const TOP_SHOWN = 10;
const CUMUL_DAYS = 30;

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)',
};
const muted: React.CSSProperties = { fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' };
const UP = '#3B7D6E';

const fmt = (n: number) => n.toLocaleString('fr-FR');

type Mode = 'week' | 'cumul';

/**
 * Onglet « Trafic sortant » : clics vers le site web / la réservation des fiches.
 * Vue par semaine (lundi–dimanche) pour les sorties, qui changent chaque semaine ; cumul
 * 30 jours, avec tendance sur 4 semaines, pour les lieux et activités, dont le trafic est faible.
 */
export function OutboundTab({ isAdmin }: { isAdmin: boolean }) {
  const now = useMemo(() => new Date(), []);
  // 1 semaine de plus que celles affichées : la plus ancienne a besoin d'une semaine précédente à comparer.
  const allWeeks = useMemo(() => buildWeeks(now, WEEKS_SHOWN + 1), [now]);
  const weeks = useMemo(() => allWeeks.slice(1), [allWeeks]);

  const { data, isLoading, error } = useOutboundClicks(allWeeks[0].start, isAdmin);
  const [mode, setMode] = useState<Mode>('week');
  const [sel, setSel] = useState(weeks.length - 1);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const trendWeeks = useMemo(() => allWeeks.slice(-TREND_WEEKS), [allWeeks]);
  const trends = useMemo(() => trendByKey(rows, trendWeeks), [rows, trendWeeks]);
  const cumulFrom = useMemo(() => addDays(now, -CUMUL_DAYS).getTime(), [now]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Chip active={mode === 'week'} onClick={() => setMode('week')}>Par semaine</Chip>
          <Chip active={mode === 'cumul'} onClick={() => setMode('cumul')}>Cumul {CUMUL_DAYS} jours</Chip>
        </div>
      </div>

      {isLoading && <div style={muted}>Chargement…</div>}
      {error && <div style={{ ...muted, color: 'var(--primary)' }}>Impossible de charger les statistiques.</div>}
      {data?.truncated && (
        <div style={{ ...muted, color: 'var(--primary)', marginBottom: '12px' }}>
          Très gros volume de clics : les chiffres sont tronqués, contacte le support pour passer sur une agrégation côté base.
        </div>
      )}

      {!isLoading && !error && mode === 'week' && (
        <WeekView rows={rows} weeks={weeks} sel={sel} onSelect={setSel} now={now} trends={trends} cumulFrom={cumulFrom} cumulTo={now.getTime() + 1} />
      )}
      {!isLoading && !error && mode === 'cumul' && (
        <div className="flex flex-col gap-4">
          {(['events', 'places', 'activities'] as ClickGroup[]).map((g) => (
            <Ranking
              key={g}
              title={GROUP_LABELS[g]}
              rows={rankClicks(rows, cumulFrom, now.getTime() + 1, g)}
              trends={trends}
              empty="Aucun clic sur la période 😴"
            />
          ))}
        </div>
      )}
    </div>
  );
}

const GROUP_LABELS: Record<ClickGroup, string> = { events: 'Sorties', places: 'Lieux', activities: 'Activités' };

function WeekView({
  rows, weeks, sel, onSelect, now, trends, cumulFrom, cumulTo,
}: {
  rows: ClickRow[]; weeks: Week[]; sel: number; onSelect: (i: number) => void; now: Date;
  trends: Map<string, number[]>; cumulFrom: number; cumulTo: number;
}) {
  const [showOthers, setShowOthers] = useState(false);
  const week = weeks[sel];
  const current = isCurrentWeek(week, now);
  const from = week.start.getTime();
  const to = week.end.getTime();
  const prev = previousWindow(week, now);

  const totals = useMemo(() => weeks.map((w) => countClicks(rows, w.start.getTime(), w.end.getTime())), [rows, weeks]);
  const max = Math.max(1, ...totals);

  const kpis = (['events', 'places', 'activities'] as ClickGroup[]).map((g) => {
    const value = countClicks(rows, from, to, g);
    const before = countClicks(rows, prev.from, prev.to, g);
    return { g, value, before, delta: deltaPct(value, before) };
  });

  const events = useMemo(() => rankClicks(rows, from, to, 'events'), [rows, from, to]);
  // « Nouveau » : la fiche n'avait reçu aucun clic sur toute la semaine d'avant.
  const seenBefore = useMemo(
    () => entityIdsClicked(rows, addDays(week.start, -7).getTime(), from),
    [rows, week, from],
  );

  return (
    <div className="flex flex-col gap-4">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <NavButton label="Semaine précédente" disabled={sel === 0} onClick={() => onSelect(sel - 1)}>‹</NavButton>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: '18px', fontWeight: 500, color: 'var(--text)' }}>Semaine du {weekLabel(week)}</div>
          <div style={muted}>
            {current
              ? `En cours · ${now.toLocaleDateString('fr-FR', { weekday: 'long' })}, semaine incomplète`
              : 'Semaine terminée'}
          </div>
        </div>
        <NavButton label="Semaine suivante" disabled={sel === weeks.length - 1} onClick={() => onSelect(sel + 1)}>›</NavButton>
      </div>

      <div style={card}>
        <div style={{ ...muted, marginBottom: '8px' }}>Clics sortants, {weeks.length} dernières semaines</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
          {weeks.map((w, i) => (
            <button
              key={w.start.getTime()}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={i === sel}
              aria-label={`Semaine du ${weekLabel(w)} : ${totals[i]} clics`}
              style={{
                flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                gap: '4px', height: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <span style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: i === sel ? 700 : 500, color: i === sel ? 'var(--primary)' : 'var(--text-muted)' }}>
                {fmt(totals[i])}
              </span>
              <span
                style={{
                  width: '100%', maxWidth: '44px', borderRadius: '4px 4px 0 0',
                  height: `${Math.max(2, Math.round((totals[i] / max) * 72))}px`,
                  background: i === sel ? 'var(--primary)' : 'var(--border)',
                  opacity: isCurrentWeek(w, now) ? 0.6 : 1,
                }}
              />
              <span style={{ fontFamily: 'DM Sans', fontSize: '10px', color: i === sel ? 'var(--text)' : 'var(--text-muted)' }}>
                {dayMonth(w.start)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        {kpis.map((k) => (
          <div key={k.g} style={card}>
            <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{GROUP_LABELS[k.g]}</div>
            <div style={{ fontFamily: 'Fraunces', fontSize: '32px', fontWeight: 500, color: k.value ? 'var(--primary)' : 'var(--text-muted)', letterSpacing: '-0.02em' }}>
              {fmt(k.value)}
            </div>
            <Delta delta={k.delta} before={k.before} current={current} />
          </div>
        ))}
      </div>

      <Ranking
        title="Sorties les plus cliquées"
        rows={events}
        trends={null}
        isNew={(r) => !seenBefore.has(`${r.entityType}:${r.entityId}`)}
        empty={current ? 'Aucun clic pour l’instant cette semaine 😴' : 'Aucun clic cette semaine-là 😴'}
      />

      <div style={card}>
        <button
          type="button"
          onClick={() => setShowOthers((v) => !v)}
          aria-expanded={showOthers}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
        >
          <span>Lieux et activités · cumul {CUMUL_DAYS} jours</span>
          <span style={{ color: 'var(--text-muted)' }}>{showOthers ? '▾' : '▸'}</span>
        </button>
        {showOthers && (
          <div className="flex flex-col gap-4" style={{ marginTop: '12px' }}>
            {(['places', 'activities'] as ClickGroup[]).map((g) => (
              <Ranking key={g} title={GROUP_LABELS[g]} rows={rankClicks(rows, cumulFrom, cumulTo, g)} trends={trends} empty="Aucun clic sur la période 😴" flat />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Delta({ delta, before, current }: { delta: number | null; before: number; current: boolean }) {
  const ref = current ? 'même point sem. préc.' : 'sem. préc.';
  if (delta === null) {
    return <div style={muted}>{before === 0 ? `rien sur la ${ref}` : '—'}</div>;
  }
  const up = delta >= 0;
  return (
    <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: up ? UP : 'var(--primary)' }}>
      {up ? '+' : ''}{delta} % <span style={{ color: 'var(--text-muted)' }}>vs {ref}</span>
    </div>
  );
}

function Ranking({
  title, rows, trends, isNew, empty, flat = false,
}: {
  title: string; rows: RankedRow[]; trends: Map<string, number[]> | null; isNew?: (r: RankedRow) => boolean; empty: string; flat?: boolean;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, TOP_SHOWN);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const wrap: React.CSSProperties = flat ? {} : card;

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text)', fontWeight: 600 }}>{title}</span>
        <span style={muted}>{rows.length} fiche{rows.length > 1 ? 's' : ''} · {fmt(total)} clic{total > 1 ? 's' : ''}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ ...muted, fontSize: '13px' }}>{empty}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((r, i) => (
            <RankingRow key={r.key} rank={i + 1} row={r} trend={trends?.get(r.key) ?? null} isNew={isNew?.(r) ?? false} />
          ))}
          {rows.length > TOP_SHOWN && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              style={{ all: 'unset', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', padding: '4px 2px' }}
            >
              {all ? 'Réduire' : `Voir tout (${rows.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RankingRow({ rank, row, trend, isNew }: { rank: number; row: RankedRow; trend: number[] | null; isNew: boolean }) {
  const href = `/${row.entityType === 'event' ? 'event' : 'location'}/${row.entityId}`;
  const booking = row.linkType === 'booking';
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span style={{ fontFamily: 'Fraunces', fontSize: '14px', color: 'var(--text-muted)', width: '18px', flexShrink: 0 }}>{rank}</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {row.name ?? 'Fiche supprimée'}
        </a>
        {row.entityType === 'location' && row.category && (
          <span style={{ ...muted, flexShrink: 0 }}>{categoryLabels[row.category as keyof typeof categoryLabels] ?? row.category}</span>
        )}
        {/* Seules les sorties portent un lien de réservation : le badge n'a de sens que pour elles. */}
        {row.entityType === 'event' && (
          <Pill tone={booking ? 'primary' : 'neutral'}>{booking ? 'réservation' : 'site web'}</Pill>
        )}
        {isNew && <Pill tone="new">nouveau</Pill>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {trend && <Trend values={trend} />}
        <span style={{ fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 700, color: 'var(--primary)', minWidth: '28px', textAlign: 'right' }}>{fmt(row.count)}</span>
      </div>
    </div>
  );
}

function Trend({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span
      title={`Clics par semaine sur ${values.length} semaines : ${values.join(' · ')}`}
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}
    >
      {values.map((v, i) => (
        <span
          key={i}
          style={{ width: '5px', height: `${Math.max(2, Math.round((v / max) * 16))}px`, borderRadius: '1px', background: i === values.length - 1 ? 'var(--primary)' : 'var(--border)' }}
        />
      ))}
    </span>
  );
}

function Pill({ tone, children }: { tone: 'primary' | 'neutral' | 'new'; children: React.ReactNode }) {
  const styles = {
    primary: { background: 'var(--primary)', color: '#fff' },
    neutral: { background: 'var(--border)', color: 'var(--text-muted)' },
    new: { background: UP, color: '#fff' },
  }[tone];
  return (
    <span style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, flexShrink: 0, ...styles }}>
      {children}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '7px 14px', borderRadius: '100px', fontFamily: 'DM Sans', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--bg)',
        color: active ? '#fff' : 'var(--text)',
      }}
    >
      {children}
    </button>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '34px', height: '34px', borderRadius: '100px', border: '1px solid var(--border)', background: 'var(--bg)',
        fontSize: '18px', lineHeight: 1, cursor: disabled ? 'default' : 'pointer', color: 'var(--text)', opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}
