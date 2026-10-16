import { describe, it, expect } from 'vitest';
import {
  checkRuns,
  lastScheduled,
  type SourcingRun,
} from '../../supabase/functions/_shared/sourcing/watchdog.ts';

// Le watchdog tourne chaque jour à 17:00 UTC. Lundi 19/10/2026 : collecte prévue à 07:00 UTC.
// Jeudi 22/10/2026 : rattrapage prévu à 11:00 UTC.
const LUNDI_17H = new Date('2026-10-19T17:00:00Z');
const MARDI_17H = new Date('2026-10-20T17:00:00Z');
const JEUDI_17H = new Date('2026-10-22T17:00:00Z');

const run = (over: Partial<SourcingRun>): SourcingRun => ({
  routine: 'weekly',
  status: 'ok',
  started_at: '2026-10-19T07:02:00Z',
  inserted: 42,
  error: null,
  ...over,
});

describe('lastScheduled', () => {
  it('retrouve le lundi 07:00 UTC le jour même, une fois passé', () => {
    expect(lastScheduled('weekly', new Date('2026-10-19T13:00:00Z')).toISOString()).toBe('2026-10-19T07:00:00.000Z');
  });
  it('remonte à la semaine précédente avant l’heure prévue', () => {
    expect(lastScheduled('weekly', new Date('2026-10-19T06:00:00Z')).toISOString()).toBe('2026-10-12T07:00:00.000Z');
  });
  it('retrouve le jeudi 11:00 UTC depuis un dimanche', () => {
    expect(lastScheduled('weekend', new Date('2026-10-25T12:00:00Z')).toISOString()).toBe('2026-10-22T11:00:00.000Z');
  });
});

describe('checkRuns', () => {
  it('ne dit rien quand le run du lundi a tourné et inséré des events', () => {
    expect(checkRuns(LUNDI_17H, [run({})])).toEqual([]);
  });

  it('signale un lundi sans compte-rendu', () => {
    expect(checkRuns(LUNDI_17H, [])).toEqual([
      { routine: 'weekly', scheduledAt: '2026-10-19T07:00:00.000Z', problem: 'missing' },
    ]);
  });

  it('ne juge pas deux fois le même run : le mardi, le lundi n’est plus regardé', () => {
    expect(checkRuns(MARDI_17H, [])).toEqual([]);
  });

  it('signale un run en erreur avec son message', () => {
    const v = checkRuns(LUNDI_17H, [run({ status: 'error', inserted: 0, error: 'connexion du bot refusée' })]);
    expect(v).toEqual([
      { routine: 'weekly', scheduledAt: '2026-10-19T07:00:00.000Z', problem: 'error', detail: 'connexion du bot refusée' },
    ]);
  });

  it('se contente d’une relance réussie après un échec', () => {
    const v = checkRuns(LUNDI_17H, [
      run({ status: 'error', started_at: '2026-10-19T07:01:00Z', error: 'x' }),
      run({ status: 'ok', started_at: '2026-10-19T10:30:00Z' }),
    ]);
    expect(v).toEqual([]);
  });

  it('signale un lundi qui n’insère rien, mais pas un jeudi', () => {
    expect(checkRuns(LUNDI_17H, [run({ inserted: 0 })])[0]?.problem).toBe('empty');
    expect(
      checkRuns(JEUDI_17H, [run({ routine: 'weekend', started_at: '2026-10-22T11:05:00Z', inserted: 0 })]),
    ).toEqual([]);
  });

  it('compte un run lancé à la main la veille de l’heure prévue', () => {
    expect(checkRuns(LUNDI_17H, [run({ started_at: '2026-10-18T20:00:00Z' })])).toEqual([]);
  });

  it('ne prend pas le run de la semaine précédente pour celui du jour', () => {
    const v = checkRuns(LUNDI_17H, [run({ started_at: '2026-10-12T07:02:00Z' })]);
    expect(v[0]?.problem).toBe('missing');
  });

  it('signale le jeudi manquant le jeudi soir', () => {
    expect(checkRuns(JEUDI_17H, [])).toEqual([
      { routine: 'weekend', scheduledAt: '2026-10-22T11:00:00.000Z', problem: 'missing' },
    ]);
  });
});
