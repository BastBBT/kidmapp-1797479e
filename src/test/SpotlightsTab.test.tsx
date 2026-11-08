import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpotlightsTab } from '@/components/admin/SpotlightsTab';

let statsPayload: unknown;
let statsError: boolean;

const row = {
  id: 's1', event_id: 'e1', headline: 'Le spectacle à ne pas rater', message: null,
  starts_on: '2026-11-12', ends_on: '2026-11-21', frequency: 'weekend',
  show_calendar_cta: true, show_photo: true, last_reminder: true, created_at: '2026-11-08T10:00:00Z',
  events: { name: 'Le Grand Voyage de Pomme', category: 'Spectacle', date_start: '2026-11-21', date_end: null },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => ({ order: async () => ({ data: [row], error: null }) }) }) }),
    rpc: async () => (statsError ? { data: null, error: { message: 'boom' } } : { data: statsPayload, error: null }),
  },
}));
vi.mock('@/hooks/useEvents', () => ({ useEvents: () => ({ data: [] }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;

const render = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <SpotlightsTab isAdmin />
      </QueryClientProvider>,
    );
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

/** Paires étiquette → valeur de toutes les tuiles de statistiques. */
const tiles = () =>
  Array.from(container.querySelectorAll('dt')).map((dt) => [dt.textContent, dt.nextElementSibling?.textContent] as const);
const tile = (label: string) => tiles().find(([l]) => l === label)?.[1];
const platformRows = () =>
  Array.from(container.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.children).map((c) => c.textContent));

const oldPayload = [{ id: 's1', headline: 'x', eventName: 'y', shown: 6, shownLast: 2, opens: 3, calendarAdds: 1, dismisses: 4, uniqueViewers: 5 }];
const newPayload = [{
  ...oldPayload[0],
  sessionsShown: 9, sessionsClicked: 3, uniqueClickers: 2, uniqueOpeners: 2, uniqueCalendarAdders: 1, uniqueDismissers: 3,
  firstShownAt: '2026-11-12T10:05:00+00:00', lastShownAt: '2026-11-19T17:30:00+00:00',
  byPlatform: { web: { viewers: 3, clickers: 1 }, ios: { viewers: 2, clickers: 1 }, android: { viewers: 0, clickers: 0 } },
}];

describe('SpotlightsTab : statistiques', () => {
  beforeEach(() => {
    statsError = false;
    vi.useRealTimers();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('avant la migration Lovable : les anciens chiffres s’affichent, les nouveaux sont « — » et non 0', async () => {
    statsPayload = oldPayload;
    await render();
    expect(tile('Affichages')).toBe('8');
    expect(container.textContent).toContain('dont 2 rappels');
    expect(tile('Appareils uniques')).toBe('5');
    expect(tile('Sessions')).toBe('—');
    expect(tile('Ont cliqué')).toBe('—');
    expect(tile('Voir')).toBe('—');
    expect(tile('Agenda')).toBe('—');
    expect(tile('Sessions avec clic')).toBe('—');
    expect(tile('Taps « Voir »')).toBe('3');
    expect(tile('Ajouts agenda')).toBe('1');
    expect(container.textContent).not.toContain('% des appareils');
    expect(container.textContent).not.toContain('Vue du');
    expect(platformRows()).toEqual([
      ['Web', '—', '—', '—'],
      ['iOS', '—', '—', '—'],
      ['Android', '—', '—', '—'],
    ]);
  });

  it('après la migration : sessions, appareils, taux par appareils, période de vue et plateformes', async () => {
    statsPayload = newPayload;
    await render();
    expect(tile('Sessions')).toBe('9');
    expect(tile('Appareils uniques')).toBe('5');
    expect(tile('Ont cliqué')).toBe('2');
    expect(container.textContent).toContain('40 % des appareils');
    expect(tile('Voir')).toBe('2');
    expect(tile('Agenda')).toBe('1');
    expect(tile('Sessions avec clic')).toBe('3');
    expect(container.textContent).toContain('Vue du 12 nov. au 19 nov.');
    expect(platformRows()).toEqual([
      ['Web', '3', '1', '33 %'],
      ['iOS', '2', '1', '50 %'],
      ['Android', '0', '0', '—'],
    ]);
  });

  it('garde l’aide sur ce qu’on mesure : des appareils, pas des personnes', async () => {
    statsPayload = newPayload;
    await render();
    expect(container.textContent).toContain('un appareil = un téléphone ou un navigateur');
    expect(container.textContent).toContain('aucune liste de personnes');
    expect(container.textContent).not.toContain('Spectateurs uniques');
  });

  it('sans aucune ligne de résultat pour la mise en avant : le passé vaut 0, le reste « — »', async () => {
    statsPayload = [];
    await render();
    expect(tile('Affichages')).toBe('0');
    expect(tile('Appareils uniques')).toBe('0');
    expect(tile('Ont cliqué')).toBe('—');
  });

  it('quand la fonction échoue : la carte reste lisible et prévient que les chiffres ne sont pas fiables', async () => {
    statsError = true;
    await render();
    expect(container.textContent).toContain('ne sont pas fiables');
    expect(tile('Ont cliqué')).toBe('—');
  });
});
