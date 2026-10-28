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

  it('marque la plus grosse perte en proportion de l’étape précédente, une seule fois', () => {
    const flagged = buildFunnelSteps(base).filter((s) => s.biggestDrop).map((s) => s.key);
    // 229 -> 93 : -59 %, 42 -> 16 : -62 % ; en valeur absolue inscrits -> enfant l'emporterait
    expect(flagged).toEqual(['sendEnabled']);
  });

  it('retient l’étape la plus dure de la cohorte 30 jours du 28/10', () => {
    const d30: FunnelCounts = { registered: 71, withChildren: 45, withZone: 13, sendEnabled: 2, receivedSend: 2, receivedEmail: 2, receivedPush: 0, active: 1 };
    expect(buildFunnelSteps(d30).find((s) => s.biggestDrop)?.key).toBe('sendEnabled'); // 13 -> 2 : -85 %
  });

  it('garde la première étape en cas d’égalité de perte', () => {
    const tie: FunnelCounts = { ...base, registered: 100, withChildren: 50, withZone: 25, sendEnabled: 25, receivedSend: 25, active: 25 };
    expect(buildFunnelSteps(tie).filter((s) => s.biggestDrop).map((s) => s.key)).toEqual(['withChildren']);
  });

  it('ignore une étape à zéro dans le calcul de perte relative', () => {
    const dead: FunnelCounts = { ...base, registered: 10, withChildren: 4, withZone: 0, sendEnabled: 0, receivedSend: 0, active: 0 };
    const steps = buildFunnelSteps(dead);
    expect(steps.find((s) => s.biggestDrop)?.key).toBe('withZone'); // -100 %
    expect(steps.every((s) => Number.isFinite(s.ofPrevious) && Number.isFinite(s.ofTotal))).toBe(true);
  });

  it('traite une valeur manquante ou non numérique comme 0, sans NaN', () => {
    const broken = { ...base, withZone: Number.NaN, sendEnabled: undefined, receivedSend: null } as unknown as FunnelCounts;
    const steps = buildFunnelSteps(broken);
    expect(steps.map((s) => s.value)).toEqual([229, 93, 0, 0, 0, 0]);
    expect(steps.every((s) => Number.isFinite(s.ofPrevious) && Number.isFinite(s.ofTotal))).toBe(true);
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
