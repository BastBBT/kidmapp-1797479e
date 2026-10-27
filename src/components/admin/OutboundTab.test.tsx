import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboundTab } from './OutboundTab';
import { weekStart, type ClickRow } from './outboundWeeks';

const hook = vi.hoisted(() => ({ result: { data: undefined, isLoading: false, error: null } as Record<string, unknown> }));
vi.mock('@/hooks/useOutboundClicks', () => ({ useOutboundClicks: () => hook.result }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

const render = (ui: React.ReactElement) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(ui));
};
const text = () => host.textContent ?? '';
const has = (t: string | RegExp) => (typeof t === 'string' ? text().includes(t) : t.test(text()));
const click_ = (el: Element | null) => act(() => { (el as HTMLElement).click(); });
const byLabel = (l: string) => host.querySelector(`[aria-label="${l}"]`);
const byText = (re: RegExp) => [...host.querySelectorAll('button')].find((b) => re.test(b.textContent ?? '')) ?? null;
const count = (t: string) => text().split(t).length - 1;

afterEach(() => { act(() => root.unmount()); host.remove(); });

const DAY = 24 * 60 * 60 * 1000;
const monday = weekStart(new Date()).getTime();

const click = (daysFromThisMonday: number, over: Partial<ClickRow> = {}): ClickRow => ({
  entityType: 'event', entityId: 'e1', linkType: 'website', category: null, name: 'Marché de Noël', t: monday + daysFromThisMonday * DAY + 1000, ...over,
});

describe('OutboundTab', () => {
  beforeEach(() => {
    hook.result = {
      data: {
        truncated: false,
        rows: [
          click(0), click(0), click(0, { entityId: 'e2', name: 'Cirque', linkType: 'booking' }),
          click(-7, { entityId: 'e1' }),
          click(-3, { entityId: 'e3', name: 'Ciné-goûter' }),
          click(0, { entityType: 'location', entityId: 'l1', category: 'restaurant', name: 'Café des enfants' }),
        ],
      },
      isLoading: false,
      error: null,
    };
  });

  it('affiche la semaine en cours : compteurs, classement des sorties et badge « nouveau »', () => {
    render(<OutboundTab isAdmin />);
    expect(has(/Semaine du/)).toBe(true);
    expect(has(/semaine incomplète/)).toBe(true);
    expect(has('Marché de Noël')).toBe(true);
    expect(has('Cirque')).toBe(true);
    expect(has('réservation')).toBe(true);
    // Cirque n'avait aucun clic la semaine d'avant, Marché de Noël si.
    expect(count('nouveau')).toBe(1);
    // Ciné-goûter n'a de clic que la semaine passée : absent du classement de cette semaine.
    expect(has('Ciné-goûter')).toBe(false);
  });

  it('navigue vers la semaine précédente', () => {
    render(<OutboundTab isAdmin />);
    click_(byLabel('Semaine précédente'));
    expect(has('Semaine terminée')).toBe(true);
    expect(has('Ciné-goûter')).toBe(true);
    expect(has('Cirque')).toBe(false);
  });

  it('le cumul 30 jours regroupe sorties, lieux et activités', () => {
    render(<OutboundTab isAdmin />);
    click_(byText(/Cumul 30 jours/));
    expect(has('Café des enfants')).toBe(true);
    expect(has('Ciné-goûter')).toBe(true);
    expect(has('Activités')).toBe(true);
  });

  it('signale l\'absence de clic sans planter', () => {
    hook.result = { data: { rows: [], truncated: false }, isLoading: false, error: null };
    render(<OutboundTab isAdmin />);
    expect(has(/Aucun clic pour l’instant/)).toBe(true);
  });
});
