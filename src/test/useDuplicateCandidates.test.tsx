// Les lieux publiés servent à la détection de doublons : la liste ne doit rien perdre sans le dire.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDuplicateCandidates } from '@/hooks/useDuplicateCandidates';

let rows: { id: string; name: string; address: string | null; photo: string | null }[] = [];
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: rows, error: null }) }) }) }),
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
let client: QueryClient;
let seen: number | undefined;

function Probe() {
  seen = useDuplicateCandidates().data?.length;
  return null;
}

const mount = async () => {
  await act(async () => {
    root.render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
  });
  // La requête se résout en plusieurs ticks, et React ne rend le résultat qu'à la sortie d'un `act` :
  // on attend la donnée par petits `act` successifs plutôt que par un délai fixe.
  for (let i = 0; i < 50 && seen === undefined; i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
};
const makeRows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, name: `Lieu ${i}`, address: null, photo: null }));

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  seen = undefined;
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('useDuplicateCandidates', () => {
  it('sa clé vit sous [\'locations\'] : l\'invalidation d\'une approbation l\'atteint', async () => {
    rows = makeRows(3);
    await mount();
    expect(seen).toBe(3);
    expect(client.getQueryState(['locations', 'duplicate-candidates'])?.isInvalidated).toBe(false);
    await act(async () => { await client.invalidateQueries({ queryKey: ['locations'], refetchType: 'none' }); });
    expect(client.getQueryState(['locations', 'duplicate-candidates'])?.isInvalidated).toBe(true);
  });

  it('prévient dans la console quand la liste atteint le plafond de PostgREST', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rows = makeRows(1000);
    await mount();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('tronquée');
  });

  it('reste silencieux en dessous du plafond', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rows = makeRows(999);
    await mount();
    expect(seen).toBe(999);
    expect(warn).not.toHaveBeenCalled();
  });
});
