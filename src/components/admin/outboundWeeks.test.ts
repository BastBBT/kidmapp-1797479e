import { describe, expect, it } from 'vitest';
import { buildWeeks, countClicks, deltaPct, entityIdsClicked, groupOf, isCurrentWeek, previousWindow, rankClicks, trendByKey, weekLabel, weekStart, type ClickRow } from './outboundWeeks';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

const click = (over: Partial<ClickRow> & { when: Date }): ClickRow => ({
  entityType: 'event', entityId: 'e1', linkType: 'website', category: null, name: 'Sortie', t: over.when.getTime(), ...over,
});

describe('weekStart', () => {
  it('renvoie le lundi 00:00 pour un dimanche, un lundi et un mercredi', () => {
    expect(weekStart(at(2026, 10, 25)).getDate()).toBe(19); // dimanche 25/10/2026
    expect(weekStart(at(2026, 10, 19, 0)).getDate()).toBe(19);
    expect(weekStart(at(2026, 10, 21)).getDate()).toBe(19);
    expect(weekStart(at(2026, 10, 21)).getHours()).toBe(0);
  });
});

describe('buildWeeks', () => {
  const weeks = buildWeeks(at(2026, 10, 27), 8);
  it('finit sur la semaine en cours, la plus ancienne en premier', () => {
    expect(weeks).toHaveLength(8);
    expect(weeks[7].start.getDate()).toBe(26);
    expect(isCurrentWeek(weeks[7], at(2026, 10, 27))).toBe(true);
    expect(isCurrentWeek(weeks[6], at(2026, 10, 27))).toBe(false);
  });
  it('dure 169 h quand le retour à l\'heure d\'hiver y tombe (TZ fixé à Europe/Paris)', () => {
    const w = buildWeeks(at(2026, 10, 25), 1)[0]; // 19-25 oct. 2026 : retour à l'heure d'hiver le 25/10
    expect((w.end.getTime() - w.start.getTime()) / 3_600_000).toBe(169);
    expect(w.end.getHours()).toBe(0);
  });
  it('enchaîne les semaines sans trou ni recouvrement (changement d\'heure compris)', () => {
    for (let i = 1; i < weeks.length; i++) expect(weeks[i].start.getTime()).toBe(weeks[i - 1].end.getTime());
    expect(weeks[0].start.getDate()).toBe(7); // 7 septembre : 7 semaines avant le 26/10
  });
});

describe('previousWindow', () => {
  it('semaine terminée : compare à la semaine précédente entière', () => {
    const [prev, cur] = buildWeeks(at(2026, 10, 27), 2);
    const w = previousWindow(prev, at(2026, 10, 27));
    expect(w.to).toBe(prev.start.getTime());
    expect(w.from).toBeLessThan(w.to);
    expect(cur.start.getTime()).toBe(prev.end.getTime());
  });
  it('semaine en cours : ne compare que la même portion de la semaine d\'avant', () => {
    const now = at(2026, 10, 22, 12); // jeudi midi
    const cur = buildWeeks(now, 1)[0];
    const w = previousWindow(cur, now);
    expect(w.to - w.from).toBe(now.getTime() - cur.start.getTime());
  });
});

describe('groupOf', () => {
  it('sépare sorties, lieux et activités', () => {
    expect(groupOf({ entityType: 'event', category: null })).toBe('events');
    expect(groupOf({ entityType: 'location', category: 'restaurant' })).toBe('places');
    expect(groupOf({ entityType: 'location', category: 'nature' })).toBe('activities');
    expect(groupOf({ entityType: 'location', category: null })).toBe('places');
  });
});

describe('rankClicks / countClicks', () => {
  const week = buildWeeks(at(2026, 10, 27), 1)[0];
  const from = week.start.getTime();
  const to = week.end.getTime();
  const rows = [
    click({ when: at(2026, 10, 26), entityId: 'a', name: 'B' }),
    click({ when: at(2026, 10, 27), entityId: 'a', name: 'B' }),
    click({ when: at(2026, 10, 27), entityId: 'b', name: 'A' }),
    click({ when: at(2026, 10, 27), entityId: 'b', name: 'A', linkType: 'booking' }),
    click({ when: at(2026, 10, 19), entityId: 'a', name: 'B' }), // semaine d'avant : exclu
    click({ when: at(2026, 10, 27), entityType: 'location', entityId: 'l', category: 'cafe', name: 'Café' }),
  ];

  it('ne compte que la fenêtre et le groupe demandés', () => {
    expect(countClicks(rows, from, to)).toBe(5);
    expect(countClicks(rows, from, to, 'events')).toBe(4);
    expect(countClicks(rows, from, to, 'places')).toBe(1);
  });

  it('classe par clics puis par nom, un même lieu pouvant avoir deux types de lien', () => {
    const ranked = rankClicks(rows, from, to, 'events');
    expect(ranked.map((r) => [r.entityId, r.linkType, r.count])).toEqual([
      ['a', 'website', 2],
      ['b', 'booking', 1],
      ['b', 'website', 1],
    ]);
  });
});

describe('trendByKey', () => {
  it('ventile les clics par semaine, dans l\'ordre des semaines', () => {
    const weeks = buildWeeks(at(2026, 10, 27), 3);
    const rows = [click({ when: at(2026, 10, 27) }), click({ when: at(2026, 10, 28) }), click({ when: at(2026, 10, 14) }), click({ when: at(2026, 8, 1) })];
    expect([...trendByKey(rows, weeks).values()]).toEqual([[1, 0, 2]]);
  });
});

describe('entityIdsClicked', () => {
  it('ignore le type de lien', () => {
    const rows = [click({ when: at(2026, 10, 27) }), click({ when: at(2026, 10, 27), linkType: 'booking' })];
    expect(entityIdsClicked(rows, 0, Infinity).size).toBe(1);
  });
});

describe('deltaPct', () => {
  it('renvoie null sans base de comparaison', () => {
    expect(deltaPct(5, 0)).toBeNull();
    expect(deltaPct(12, 10)).toBe(20);
    expect(deltaPct(5, 10)).toBe(-50);
  });
});

describe('weekLabel', () => {
  it('condense le mois quand la semaine ne l\'enjambe pas', () => {
    expect(weekLabel(buildWeeks(at(2026, 10, 20), 1)[0])).toMatch(/^19 – 25 oct/);
  });
  it('garde les deux mois quand la semaine les enjambe', () => {
    expect(weekLabel(buildWeeks(at(2026, 9, 30), 1)[0])).toMatch(/^28 sept.* – 4 oct/);
  });
});
