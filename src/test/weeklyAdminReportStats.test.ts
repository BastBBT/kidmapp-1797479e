import { describe, expect, it } from 'vitest';
import {
  dailySessions,
  deltaPct,
  eventIdOf,
  eventStats,
  sessionsByPlatform,
  stackHeights,
  type ViewRow,
} from '../../supabase/functions/_shared/weekly-report/stats.ts';

const E1 = '11111111-1111-4111-8111-111111111111';
const E2 = '22222222-2222-4222-8222-222222222222';
const E3 = '33333333-3333-4333-8333-333333333333';

const row = (o: Partial<ViewRow>): ViewRow => ({
  user_id: null,
  created_at: '2026-10-26T10:00:00Z',
  platform: 'web',
  session_id: null,
  device_id: null,
  path: '/',
  ...o,
});

describe('eventIdOf', () => {
  it('reconnaît /event/<uuid>, en minuscules', () => {
    expect(eventIdOf(`/event/${E1.toUpperCase()}`)).toBe(E1);
  });
  it('refuse les autres chemins', () => {
    expect(eventIdOf('/')).toBeNull();
    expect(eventIdOf(`/location/${E1}`)).toBeNull();
    expect(eventIdOf(`/event/${E1}/extra`)).toBeNull();
    expect(eventIdOf(`/event/${E1}?x=1`)).toBeNull();
  });
});

describe('deltaPct', () => {
  it('arrondit et signe', () => {
    expect(deltaPct(412, 349)).toBe(18);
    expect(deltaPct(184, 190)).toBe(-3);
    expect(deltaPct(5, 5)).toBe(0);
  });
  it('renvoie null quand la période précédente est vide', () => {
    expect(deltaPct(10, 0)).toBeNull();
    expect(deltaPct(0, 0)).toBeNull();
  });
});

describe('sessions', () => {
  const rows = [
    row({ session_id: 'a', platform: 'web' }),
    row({ session_id: 'a', platform: 'web' }), // même session, plusieurs pages
    row({ session_id: 'b', platform: 'web', created_at: '2026-10-27T10:00:00Z' }),
    row({ session_id: 'c', platform: 'ios' }),
    row({ session_id: null, platform: 'android' }), // ligne historique : ignorée
    row({ session_id: 'd', platform: 'windows' }), // plateforme inconnue : ignorée
  ];
  it('compte des sessions distinctes par plateforme', () => {
    expect(sessionsByPlatform(rows)).toEqual({ web: 2, ios: 1, android: 0 });
  });
  it('découpe par jour, lundi = 0', () => {
    const d = dailySessions(rows);
    expect(d).toHaveLength(7);
    expect(d[0]).toEqual({ web: 1, ios: 1, android: 0 }); // lundi 26/10
    expect(d[1]).toEqual({ web: 1, ios: 0, android: 0 }); // mardi 27/10
    expect(d[6]).toEqual({ web: 0, ios: 0, android: 0 });
  });
  it('une session à cheval sur deux jours compte une fois par jour', () => {
    const d = dailySessions([
      row({ session_id: 'x', created_at: '2026-10-26T23:50:00Z' }),
      row({ session_id: 'x', created_at: '2026-10-27T00:10:00Z' }),
    ]);
    expect(d[0].web + d[1].web).toBe(2);
    expect(sessionsByPlatform([
      row({ session_id: 'x', created_at: '2026-10-26T23:50:00Z' }),
      row({ session_id: 'x', created_at: '2026-10-27T00:10:00Z' }),
    ]).web).toBe(1);
  });
});

describe('eventStats', () => {
  const A = [
    row({ path: `/event/${E1}`, device_id: 'd1' }),
    row({ path: `/event/${E1}`, device_id: 'd2' }),
    row({ path: `/event/${E1}`, device_id: 'd1' }),
    row({ path: `/event/${E2}`, device_id: 'd3' }),
    row({ path: `/event/${E3}`, device_id: null, user_id: 'u9' }),
    row({ path: '/', device_id: 'd1' }), // pas une fiche de sortie
    row({ path: `/location/${E1}`, device_id: 'd7' }), // pas une sortie
  ];
  const B = [
    row({ path: `/event/${E1}`, device_id: 'd1' }),
    row({ path: `/event/${E2}`, device_id: 'd4' }),
    row({ path: `/event/${E2}`, device_id: 'd4' }),
    row({ path: '/', device_id: 'd2' }),
  ];
  const s = eventStats(A, B);

  it('compte les fiches de sorties ouvertes des deux semaines', () => {
    expect(s.views).toBe(5);
    expect(s.viewsPrev).toBe(3);
  });
  it('compte les visiteurs distincts (appareil, sinon compte)', () => {
    expect(s.visitors).toBe(4); // d1, d2, d3, u9
  });
  it('mesure le retour : seuls les visiteurs de sorties de la semaine d\'avant comptent', () => {
    expect(s.returningPct).toBe(25); // d1 seul, sur 4 ; d2 n'avait vu qu'une autre page
  });
  it('classe le top et compare à la semaine d\'avant', () => {
    expect(s.top.map((t) => [t.id, t.views, t.deltaPct])).toEqual([
      [E1, 3, 200],
      [E2, 1, -50],
      [E3, 1, null], // nouveau
    ]);
  });
  it('limite le top', () => {
    expect(eventStats(A, B, 2).top).toHaveLength(2);
  });
  it('retour non calculable sans visiteurs à comparer', () => {
    expect(eventStats(A, []).returningPct).toBeNull();
    expect(eventStats([], B).returningPct).toBeNull();
  });
});

describe('stackHeights', () => {
  it('remplit toujours exactement la zone', () => {
    for (const counts of [[90, 30, 20], [1, 1, 1], [0, 5, 0], [7, 0, 3], [130, 55, 30], [1, 0, 0]]) {
      const { empty, segs } = stackHeights(counts, 211, 70);
      expect(empty + segs.reduce((a, b) => a + b, 0)).toBe(70);
      expect(empty).toBeGreaterThanOrEqual(0);
      segs.forEach((h) => expect(h).toBeGreaterThanOrEqual(0));
    }
  });
  it('plein quand la somme vaut le max', () => {
    const { empty, segs } = stackHeights([60, 30, 10], 100, 70);
    expect(empty).toBe(0);
    expect(segs.reduce((a, b) => a + b, 0)).toBe(70);
  });
  it('jour vide : zone entièrement grise', () => {
    expect(stackHeights([0, 0, 0], 100, 70)).toEqual({ empty: 70, segs: [0, 0, 0] });
  });
  it('une petite valeur reste visible (au moins 1 px)', () => {
    const { empty } = stackHeights([1, 0, 0], 1000, 70);
    expect(empty).toBe(69);
  });
});
