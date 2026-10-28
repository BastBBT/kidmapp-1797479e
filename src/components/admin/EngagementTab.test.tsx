import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EngagementTab } from './EngagementTab';

const query = vi.hoisted(() => ({ result: { data: undefined, isLoading: false, error: null } as Record<string, unknown> }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => query.result }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

const render = () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<EngagementTab isAdmin />));
};
const text = () => host.textContent ?? '';
const button = (label: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === label) as HTMLElement;

afterEach(() => { act(() => root.unmount()); host.remove(); });

const send = { emailSent: 0, emailFailed: 0, emailSuppressed: 0, skippedNoMatch: 0, pushSent: 0, pushFailed: 0 };
const segment = { with: { users: 0, active: 0 }, without: { users: 0, active: 0 } };
const stats = (withFunnel: boolean) => ({
  registered: 529,
  assistant: { opens: 0, completions: 0, users: 0, completers: 0 },
  profile: { withChildren: 0, withChildFirstName: 0, childrenTotal: 0, withZone: 0, digestEmail: 0, digestPush: 0, complete: 0 },
  pushDevices: { ios: 0, android: 0 },
  sends30d: { 'weekly-digest': send, 'new-location-alert': send },
  digestFeedback30d: { sends: 0, reactions: { love: 0, neutral: 0, sad: 0 }, unsubscribes: 0 },
  alertUnsubscribes30d: 0,
  landingVisits30d: { semaine: 0, nouveauxLieux: 0 },
  retentionBySegment: { assistantCompleted: segment, hasChildren: segment, digestEnabled: segment },
  ...(withFunnel && {
    funnel: {
      '7': { registered: 18, withChildren: 12, withZone: 4, sendEnabled: 0, receivedSend: 0, receivedEmail: 0, receivedPush: 0, active: 0 },
      '30': { registered: 71, withChildren: 45, withZone: 13, sendEnabled: 2, receivedSend: 2, receivedEmail: 2, receivedPush: 0, active: 1 },
      all: { registered: 529, withChildren: 107, withZone: 52, sendEnabled: 18, receivedSend: 15, receivedEmail: 7, receivedPush: 8, active: 12 },
    },
  }),
});

describe('EngagementTab — entonnoir', () => {
  it('affiche la cohorte 30 jours par défaut, avec le détail email et notif', () => {
    query.result = { data: stats(true), isLoading: false, error: null };
    render();
    expect(text()).toContain('Parcours des familles inscrites');
    expect(text()).toContain('71');
    expect(text()).toContain('dont email 2 · notif 0');
    expect(text()).not.toContain('Cohorte récente');
  });

  it('change de cohorte au clic et prévient que celle de 7 jours est récente', () => {
    query.result = { data: stats(true), isLoading: false, error: null };
    render();
    act(() => button('7 jours').click());
    expect(text()).toContain('Cohorte récente');
    expect(text()).toContain('18');
    act(() => button('Depuis le début').click());
    expect(text()).toContain('529');
    expect(text()).toContain('dont email 7 · notif 8');
  });

  it('signale une fenêtre absente sans casser le reste de l’onglet', () => {
    query.result = { data: stats(true), isLoading: false, error: null };
    render();
    act(() => button('90 jours').click());
    expect(text()).toContain('Entonnoir indisponible pour cette période.');
    expect(text()).toContain('Est-ce que ça sert');
  });

  it('reste affichable quand la RPC ne renvoie pas encore le bloc funnel', () => {
    query.result = { data: stats(false), isLoading: false, error: null };
    render();
    expect(text()).toContain('Entonnoir indisponible pour cette période.');
    expect(text()).toContain('Envois');
  });
});
