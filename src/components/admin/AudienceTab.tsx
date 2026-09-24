import { useMemo, useState, type ReactNode } from 'react';
import { PLATFORMS, type AudienceStats, type Platform } from './audiencePlatforms';

type Metric = 'sessions' | 'uniques';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)',
};
const cardTitle: React.CSSProperties = {
  fontFamily: 'Caveat', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '12px',
};
const sectionTitle: React.CSSProperties = {
  fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500,
};
const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Mêmes 7 jours (UTC) que ceux générés par `admin_audience_stats`. */
function last7Days() {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10)
  );
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr).getDay();
  return dayLabels[d === 0 ? 6 : d - 1];
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

export function AudienceTab({
  stats,
  acquisition,
}: {
  stats: AudienceStats;
  /** Le graphique d'acquisition existant, rendu tel quel dans cet onglet. */
  acquisition: ReactNode;
}) {
  const [metric, setMetric] = useState<Metric>('sessions');

  const totals = useMemo(() => {
    const byPlatform = PLATFORMS.map((p) => ({ ...p, value: stats.byPlatform30d[p.key]?.[metric] ?? 0 }));
    const sum = byPlatform.reduce((acc, p) => acc + p.value, 0);
    return { byPlatform, sum };
  }, [stats.byPlatform30d, metric]);

  const days = useMemo(() => {
    const rows = last7Days().map((day) => {
      const values = PLATFORMS.map((p) => stats.daily7dByPlatform[day]?.[p.key]?.[metric] ?? 0);
      return { day, values, total: values.reduce((a, b) => a + b, 0) };
    });
    const max = Math.max(...rows.map((r) => r.total), 1);
    return { rows, max };
  }, [stats.daily7dByPlatform, metric]);

  const since = stats.splitTrackingSince
    ? new Date(stats.splitTrackingSince).toLocaleDateString('fr-FR')
    : null;
  const metricLabel = metric === 'sessions' ? 'Sessions' : 'Visiteurs uniques';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ ...sectionTitle, marginBottom: 0 }}>Trafic — 30 derniers jours ✦</div>
        <MetricToggle value={metric} onChange={setMetric} />
      </div>

      <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: '12px' }}>
        ⓘ {since
          ? `Répartition par plateforme mesurée depuis le ${since}.`
          : 'Répartition par plateforme : aucune donnée encore.'}{' '}
        Les versions des apps antérieures au suivi ne remontent rien.
      </div>

      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={cardTitle}>Répartition par plateforme</div>
        <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg)', marginBottom: '12px' }}>
          {totals.sum > 0 && totals.byPlatform.map((p) => (
            <div key={p.key} style={{ width: `${(p.value / totals.sum) * 100}%`, background: p.color, transition: 'width 0.3s ease' }} title={`${p.label} : ${fmt(p.value)}`} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          {totals.byPlatform.map((p) => (
            <div key={p.key}>
              <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: p.color, marginRight: 6 }} />
                {p.emoji} {p.label}
              </div>
              <span style={{ fontFamily: 'Fraunces', fontSize: '22px', fontWeight: 500, color: 'var(--text)' }}>{fmt(p.value)}</span>{' '}
              <span style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' }}>
                {totals.sum > 0 ? Math.round((p.value / totals.sum) * 100) : 0} %
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Total : {fmt(totals.sum)} {metric === 'sessions' ? 'sessions' : 'appareils distincts'}
        </div>
      </div>

      <div style={{ ...card, marginBottom: '24px' }}>
        <div style={cardTitle}>{metricLabel} — 7 derniers jours</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '110px' }}>
          {days.rows.map((r) => (
            <div key={r.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{r.total}</span>
              <div
                title={PLATFORMS.map((p, i) => `${p.label} ${r.values[i]}`).join(' · ')}
                style={{
                  width: '100%',
                  height: `${Math.max((r.total / days.max) * 72, 4)}px`,
                  display: 'flex', flexDirection: 'column-reverse',
                  borderRadius: '4px 4px 0 0', overflow: 'hidden',
                  background: 'var(--bg)',
                  transition: 'height 0.3s ease',
                }}
              >
                {PLATFORMS.map((p, i) => (
                  <div key={p.key} style={{ flex: r.values[i], background: p.color }} />
                ))}
              </div>
              <span style={{ fontFamily: 'DM Sans', fontSize: '10px', color: 'var(--text-muted)' }}>{dayLabel(r.day)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionTitle}>Utilisateurs ✦</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <SplitCard label="Visiteurs connectés" value={stats.uniqueLoggedVisitors30d} sub="uniques (auth)" split={(p) => stats.byPlatform30d[p]?.loggedUniques ?? 0} />
        <SplitCard label="Récurrents" value={stats.recurringVisitors30d} sub="≥ 2 jours" split={(p) => stats.byPlatform30d[p]?.recurring ?? 0} />
        <SplitCard label="Actifs 30j" value={`${stats.activePct30d}%`} sub="des inscrits" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <SplitCard label="Inscrits" value={stats.totalRegistered} sub="hors admins" />
        <SplitCard label="Nouveaux inscrits 30j" value={stats.newUsers30d} sub="comptes créés" />
      </div>

      {acquisition}

      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={cardTitle}>Versions actives des apps — 30 derniers jours</div>
        <AppVersions versions={stats.appVersions30d} />
      </div>
    </div>
  );
}

function MetricToggle({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  const options: { key: Metric; label: string }[] = [
    { key: 'sessions', label: 'Sessions' },
    { key: 'uniques', label: 'Visiteurs uniques' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600,
              border: active ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)',
              background: active ? 'var(--secondary)' : 'transparent',
              color: active ? 'white' : 'var(--text-muted)',
              fontFamily: 'DM Sans', cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** StatCard de l'admin, avec en option la ventilation par plateforme sous le total. */
function SplitCard({ label, value, sub, split }: {
  label: string;
  value: number | string;
  sub: string;
  split?: (p: Platform) => number;
}) {
  return (
    <div style={card}>
      <div style={{ fontFamily: 'Caveat', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'Fraunces', fontSize: '32px', fontWeight: 500, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
        {typeof value === 'number' ? fmt(value) : value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>{sub}</div>
      {split && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', fontFamily: 'DM Sans', fontSize: '11px', color: 'var(--text-muted)' }}>
          {PLATFORMS.map((p) => (
            <span key={p.key} title={p.label}>{p.emoji} {fmt(split(p.key))}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function AppVersions({ versions }: { versions: AudienceStats['appVersions30d'] }) {
  if (versions.length === 0) {
    return (
      <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
        Aucune version remontée pour l'instant 😴
      </div>
    );
  }
  const totalByPlatform = versions.reduce<Record<string, number>>((acc, v) => {
    acc[v.platform] = (acc[v.platform] ?? 0) + v.uniques;
    return acc;
  }, {});
  return (
    <div>
      {versions.map((v) => {
        const meta = PLATFORMS.find((p) => p.key === v.platform);
        const pct = totalByPlatform[v.platform] ? Math.round((v.uniques / totalByPlatform[v.platform]) * 100) : 0;
        return (
          <div key={`${v.platform}-${v.version}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--text)' }}>
            <span>{meta?.emoji} {meta?.label} {v.version}</span>
            <span style={{ color: 'var(--text-muted)' }}>{fmt(v.uniques)} appareil{v.uniques > 1 ? 's' : ''} · {pct} %</span>
          </div>
        );
      })}
    </div>
  );
}
