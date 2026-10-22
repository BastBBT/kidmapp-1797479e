import type { DuplicateMatch } from '@/lib/duplicateLocation';

const WHY = (m: DuplicateMatch): string =>
  m.level === 'strong' ? 'Même adresse · nom proche' : m.sameAddress ? 'Même adresse, nom différent' : 'Nom proche, adresse différente';

/** Badge « Doublon possible » à côté du statut d'une proposition en attente. */
export function DuplicateBadge() {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 100, whiteSpace: 'nowrap',
        fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, background: '#FEF9E7', color: '#8A6A00', border: '1px solid #EBD58A',
      }}
    >
      ⚠ Doublon possible
    </span>
  );
}

/** Le ou les lieux déjà publiés qui ressemblent à la proposition, avec un lien vers leur fiche. */
export function DuplicateReviewNote({ matches }: { matches: DuplicateMatch[] }) {
  return (
    <div style={{ background: '#FEF9E7', border: '1px solid #EBD58A', borderRadius: 12, padding: '10px 12px', margin: '6px 0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'DM Sans', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#8A6A00' }}>
        Déjà en base
      </div>
      {matches.map((m) => (
        <div key={m.candidate.id} style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{m.candidate.name}</span>
          {m.candidate.address && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>📍 {m.candidate.address}</span>}
          <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ color: '#8A6A00', fontWeight: 600 }}>{WHY(m)}</span>
            <a href={`/location/${m.candidate.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Voir la fiche existante ↗
            </a>
          </span>
        </div>
      ))}
    </div>
  );
}
