import type { CSSProperties } from 'react';

/** Segment d'une barre d'onglets en capsule (période de Sorties, groupe d'Explorer). */
export const segmentStyle = (active: boolean): CSSProperties => ({
  flex: 1, minHeight: 34, border: 'none', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
  fontFamily: 'DM Sans', fontSize: 13, fontWeight: active ? 600 : 500,
  background: active ? 'var(--surface)' : 'transparent',
  color: active ? 'var(--text)' : 'var(--text-muted)',
  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
});
