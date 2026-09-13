import { describe, expect, it } from 'vitest';
import { RELANCE_DELAY_MS, pendingRelanceKind } from '@/lib/relance';

const NOW = Date.parse('2026-09-13T12:00:00Z');
const old = new Date(NOW - RELANCE_DELAY_MS - 1000).toISOString();
const recent = new Date(NOW - RELANCE_DELAY_MS + 1000).toISOString();

const base = {
  createdAt: old,
  zoneCity: null as string | null,
  digestEmailEnabled: false,
  digestPushEnabled: false,
  snoozed: false,
};

describe('pendingRelanceKind', () => {
  it('ne relance pas un compte de moins de 30 jours', () => {
    expect(pendingRelanceKind({ ...base, createdAt: recent }, NOW)).toBeNull();
  });

  it('relance pile au seuil des 30 jours', () => {
    const atThreshold = new Date(NOW - RELANCE_DELAY_MS).toISOString();
    expect(pendingRelanceKind({ ...base, createdAt: atThreshold }, NOW)).toBe('zone');
  });

  it('ne relance pas sans date de création lisible', () => {
    expect(pendingRelanceKind({ ...base, createdAt: null }, NOW)).toBeNull();
    expect(pendingRelanceKind({ ...base, createdAt: 'pas une date' }, NOW)).toBeNull();
  });

  it('donne la priorité à la zone sur le canal', () => {
    expect(pendingRelanceKind(base, NOW)).toBe('zone');
  });

  it('bascule sur le canal une fois la zone renseignée', () => {
    expect(pendingRelanceKind({ ...base, zoneCity: 'Nantes' }, NOW)).toBe('channel');
  });

  it('se tait dès qu\'un canal est actif', () => {
    expect(pendingRelanceKind({ ...base, zoneCity: 'Nantes', digestEmailEnabled: true }, NOW)).toBeNull();
    expect(pendingRelanceKind({ ...base, zoneCity: 'Nantes', digestPushEnabled: true }, NOW)).toBeNull();
  });

  it('se tait pendant un snooze, quelle que soit la donnée manquante', () => {
    expect(pendingRelanceKind({ ...base, snoozed: true }, NOW)).toBeNull();
    expect(pendingRelanceKind({ ...base, zoneCity: 'Nantes', snoozed: true }, NOW)).toBeNull();
  });
});
