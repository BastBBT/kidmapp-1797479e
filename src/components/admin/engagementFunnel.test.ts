import { describe, expect, it } from 'vitest';
import { buildFunnelSteps, type FunnelCounts } from './engagementFunnel';

const base: FunnelCounts = {
  registered: 229, withChildren: 93, withZone: 42, sendEnabled: 16, receivedSend: 13,
  receivedEmail: 5, receivedPush: 8, active: 10,
};

describe('buildFunnelSteps', () => {
  it('rend six étapes dans l’ordre du parcours', () => {
    expect(buildFunnelSteps(base).map((s) => s.key)).toEqual([
      'registered', 'withChildren', 'withZone', 'sendEnabled', 'receivedSend', 'active',
    ]);
  });

  it('calcule la part par rapport à l’étape précédente et au total', () => {
    const [first, children, zone] = buildFunnelSteps(base);
    expect(first.ofPrevious).toBe(100);
    expect(children.ofPrevious).toBe(41); // 93 / 229 = 40,6
    expect(children.ofTotal).toBe(41);
    expect(zone.ofPrevious).toBe(45); // 42 / 93 = 45,2
    expect(zone.ofTotal).toBe(18); // 42 / 229 = 18,3
  });

  it('marque la plus grosse perte en nombre de familles, une seule fois', () => {
    const flagged = buildFunnelSteps(base).filter((s) => s.biggestDrop).map((s) => s.key);
    expect(flagged).toEqual(['withChildren']); // 229 -> 93 : -136
  });

  it('ne signale aucune perte quand l’entonnoir est plat', () => {
    const flat: FunnelCounts = { ...base, registered: 5, withChildren: 5, withZone: 5, sendEnabled: 5, receivedSend: 5, active: 5 };
    expect(buildFunnelSteps(flat).some((s) => s.biggestDrop)).toBe(false);
  });

  it('borne chaque étape par la précédente si les données sont incohérentes', () => {
    const odd: FunnelCounts = { ...base, withZone: 200 };
    const steps = buildFunnelSteps(odd);
    expect(steps[2].value).toBe(93);
    expect(steps.every((s, i) => i === 0 || s.value <= steps[i - 1].value)).toBe(true);
  });

  it('gère une cohorte vide sans diviser par zéro', () => {
    const empty: FunnelCounts = { registered: 0, withChildren: 0, withZone: 0, sendEnabled: 0, receivedSend: 0, receivedEmail: 0, receivedPush: 0, active: 0 };
    const steps = buildFunnelSteps(empty);
    expect(steps.every((s) => s.ofTotal === 0)).toBe(true);
    expect(steps.some((s) => s.biggestDrop)).toBe(false);
  });
});
