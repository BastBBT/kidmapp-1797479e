import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

// Briques communes aux barres et panneaux de filtres de Sorties et d'Explorer.
// Miroir de `FilterChip` / `FilterOptionPill` (SortiesView.swift) et de
// `filter_chips.dart` (Android).

/** Pastille de la barre de filtres ; `removable` = filtre posé depuis le panneau, avec sa croix. */
export const FilterChip = ({ label, on, removable, onClick, removeLabel }: { label: string; on: boolean; removable?: boolean; onClick: () => void; removeLabel: string }) => (
  <button
    type="button"
    aria-pressed={on}
    title={removable ? removeLabel : undefined}
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, minHeight: 36, padding: '0 13px', borderRadius: 999, cursor: 'pointer',
      fontFamily: 'DM Sans', fontSize: 13, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap',
      color: on ? 'var(--text)' : 'var(--text-muted)',
      background: on ? 'var(--secondary-light)' : 'var(--surface)',
      border: `${on ? 1.5 : 1}px solid ${on ? 'var(--secondary)' : 'var(--border)'}`,
    }}
  >
    {label}
    {removable && <X size={13} aria-hidden />}
  </button>
);

/** Bouton « Filtres » en tête de la barre, avec le nombre de filtres actifs. */
export const FiltersButton = ({ label, count, onClick }: { label: string; count: number; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, minHeight: 36, padding: '0 13px', borderRadius: 999, cursor: 'pointer',
      fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--text)',
    }}
  >
    <SlidersHorizontal size={14} aria-hidden />
    {label}
    {count > 0 && (
      <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: 'var(--primary)', color: '#fff', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
        {count}
      </span>
    )}
  </button>
);

/** Option à cocher d'un panneau Filtres, avec son nombre de résultats. Une option qui ne donnerait rien s'estompe. */
export const FilterOption = ({ label, on, count, onClick }: { label: string; on: boolean; count: number; onClick: () => void }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 40, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
      fontFamily: 'DM Sans', fontSize: 13, fontWeight: on ? 600 : 500, color: 'var(--text)',
      background: on ? 'var(--secondary-light)' : 'var(--surface)',
      border: `${on ? 1.5 : 1}px solid ${on ? 'var(--secondary)' : 'var(--border)'}`,
      opacity: count === 0 && !on ? 0.45 : 1,
    }}
  >
    {label}
    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{count}</span>
  </button>
);

export const FilterSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
    <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{title}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
  </div>
);
