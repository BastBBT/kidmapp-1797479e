import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { categoryLabels, type LocationCategory } from '@/types/location';
import { PLATFORMS, type Platform } from './audiencePlatforms';
import { forPlatform, rankBy, splitLocations, type PageSort, type TopEvent, type TopLocation, type TopPagesStats } from './topPages';

type Kind = 'places' | 'activities' | 'events';

const KIND_LABELS: Record<Kind, string> = { places: 'Lieux', activities: 'Activités', events: 'Sorties' };
const PAGE_SIZE = 30;
const COLS = 'minmax(0, 1fr) 64px 64px 64px';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '16px', boxShadow: 'var(--shadow)',
};
const sectionTitle: React.CSSProperties = {
  fontFamily: 'Caveat', fontSize: '15px', color: 'var(--text-muted)', fontWeight: 500,
};
const muted: React.CSSProperties = { fontFamily: 'DM Sans', fontSize: '12px', color: 'var(--text-muted)' };

const fmt = (n: number) => n.toLocaleString('fr-FR');

export function TopPagesTab({ isAdmin }: { isAdmin: boolean }) {
  const [kind, setKind] = useState<Kind>('places');
  const [sort, setSort] = useState<PageSort>('views30d');
  const [platform, setPlatform] = useState<Platform | 'all'>('all');
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-top-pages'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_top_pages');
      if (error) throw error;
      return data as unknown as TopPagesStats;
    },
  });

  const lists = useMemo(() => {
    if (!data) return null;
    const { places, activities } = splitLocations(data.locations ?? []);
    return { places, activities, events: data.events ?? [] };
  }, [data]);

  if (isLoading) return <div style={{ ...muted, textAlign: 'center', padding: '24px 0' }}>Chargement…</div>;
  if (error || !data || !lists) {
    return <div style={{ ...muted, textAlign: 'center', padding: '24px 0' }}>Impossible de charger le classement des pages.</div>;
  }

  const rows = rankBy<TopLocation | TopEvent>(forPlatform<TopLocation | TopEvent>(lists[kind], platform), sort);
  const shown = expanded ? rows : rows.slice(0, PAGE_SIZE);
  const unvisited = kind === 'events' ? 0 : rows.filter((r) => r.viewsTotal === 0).length;
  const since = data.trackingSince ? new Date(data.trackingSince).toLocaleDateString('fr-FR') : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={sectionTitle}>Pages les plus vues ✦</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => { setKind(k); setExpanded(false); }}>
              {KIND_LABELS[k]} <span style={{ opacity: 0.7 }}>({fmt(lists[k].length)})</span>
            </Chip>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Chip active={platform === 'all'} onClick={() => setPlatform('all')}>Toutes plateformes</Chip>
        {PLATFORMS.map((p) => (
          <Chip key={p.key} active={platform === p.key} onClick={() => setPlatform(p.key)}>{p.label}</Chip>
        ))}
      </div>

      <div style={card}>
        <div style={{ ...rowStyle(true), borderTop: 'none' }}>
          <div>{KIND_LABELS[kind]}</div>
          <SortHead active={sort === 'views30d'} onClick={() => setSort('views30d')}>30 j</SortHead>
          <SortHead active={sort === 'viewsTotal'} onClick={() => setSort('viewsTotal')}>Total</SortHead>
          <div style={{ textAlign: 'right' }} title="Visiteurs distincts sur 30 jours, toutes plateformes">{platform === 'all' ? 'Visit.' : ''}</div>
        </div>

        {shown.length === 0 && <div style={{ ...muted, padding: '12px 0' }}>Aucune visite enregistrée.</div>}
        {shown.map((r, i) => {
          const href = kind === 'events' ? `/event/${r.id}` : `/location/${r.id}`;
          const sub =
            'category' in r
              ? `${categoryLabels[r.category as LocationCategory] ?? r.category} · ${r.city}`
              : r.recurrenceLabel ?? new Date(r.dateStart).toLocaleDateString('fr-FR');
          return (
            <div key={r.id} style={rowStyle(false)}>
              <div style={{ minWidth: 0 }}>
                <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
                  <span style={{ ...muted, marginRight: '6px' }}>{i + 1}.</span>{r.name}
                </a>
                <div style={{ ...muted, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
              </div>
              <Num strong={sort === 'views30d'} value={r.views30d} />
              <Num strong={sort === 'viewsTotal'} value={r.viewsTotal} />
              {platform === 'all' ? <Num value={r.visitors30d} /> : <div />}
            </div>
          );
        })}

        {rows.length > PAGE_SIZE && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', padding: 0 }}
          >
            {expanded ? 'Réduire' : `Voir les ${fmt(rows.length)} fiches`}
          </button>
        )}
        {unvisited > 0 && (
          <div style={{ ...muted, fontSize: '11px', marginTop: '8px' }}>
            {fmt(unvisited)} fiche(s) sans aucune visite enregistrée — en fin de liste quand on trie par visites.
          </div>
        )}
      </div>

      <div style={{ ...muted, fontSize: '11px', marginTop: '8px' }}>
        Visites = fiches ouvertes (une ouverture = une visite, une même personne qui revient compte plusieurs fois).
        Les apps iOS et Android ne comptent les fiches qu'à partir de la version qui suit cette mise à jour : tant qu'elle
        n'est pas installée, leurs visites sont absentes, donc le total est sous-estimé.
        Les visites des admins sont exclues. « Total » court {since ? `depuis le ${since}` : 'depuis le début du suivi'} (rétention 12 mois) ;
        « Visit. » compte les appareils distincts sur 30 jours, fiable à partir du 24/10 (suivi par appareil introduit le 24/09).
      </div>
    </div>
  );
}

function rowStyle(header: boolean): React.CSSProperties {
  return {
    display: 'grid', gridTemplateColumns: COLS, gap: '8px', alignItems: 'baseline', padding: '7px 0',
    borderTop: header ? 'none' : '1px solid var(--border)',
    fontFamily: 'DM Sans', fontSize: header ? '11px' : '13px', color: header ? 'var(--text-muted)' : 'var(--text)',
  };
}

function Num({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <div style={{ textAlign: 'right', fontWeight: strong ? 700 : 400, color: value === 0 ? 'var(--text-muted)' : 'var(--text)' }}>
      {fmt(value)}
    </div>
  );
}

function SortHead({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'right',
        font: 'inherit', fontWeight: active ? 700 : 400, color: active ? 'var(--primary)' : 'inherit',
      }}
    >
      {children}{active ? ' ↓' : ''}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '5px 12px', borderRadius: '999px', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: '12px', fontWeight: 600,
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--bg)', color: active ? '#fff' : 'var(--text)',
      }}
    >
      {children}
    </button>
  );
}
