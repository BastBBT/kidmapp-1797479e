import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown[] | null; error: { message: string } | null };

const db = vi.hoisted(() => ({
  clickPages: [] as Result[],
  rangeCalls: [] as [number, number][],
  inCalls: [] as { table: string; ids: string[] }[],
  locations: [] as { id: string; name: string; category: string | null }[],
  events: [] as { id: string; name: string }[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const builder = {
        select: () => builder,
        gte: () => builder,
        lte: () => builder,
        order: () => builder,
        range: (a: number, b: number) => {
          db.rangeCalls.push([a, b]);
          return Promise.resolve(db.clickPages.shift() ?? { data: [], error: null });
        },
        in: (_col: string, ids: string[]) => {
          db.inCalls.push({ table, ids });
          const source = table === 'locations' ? db.locations : db.events;
          return Promise.resolve({ data: source.filter((r) => ids.includes(r.id)), error: null });
        },
      };
      return builder;
    },
  },
}));

import { fetchOutboundClicks, LOOKUP_CHUNK, MAX_PAGES, PAGE } from '@/hooks/useOutboundClicks';

const raw = (i: number, over: Record<string, unknown> = {}) => ({
  entity_type: 'event', entity_id: `e${i}`, category: null, link_type: 'website',
  // Plus i est grand, plus le clic est ancien : on lit du plus récent au plus ancien.
  created_at: new Date(Date.UTC(2026, 9, 25) - i * 1000).toISOString(),
  ...over,
});
const page = (from: number, n: number): Result => ({ data: Array.from({ length: n }, (_, k) => raw(from + k)), error: null });
const since = new Date(Date.UTC(2026, 7, 1));

describe('fetchOutboundClicks', () => {
  beforeEach(() => {
    db.clickPages = [];
    db.rangeCalls = [];
    db.inCalls = [];
    db.locations = [];
    db.events = [];
  });

  it('s\'arrête dès qu\'une page est incomplète et lit les plages 0-999 puis 1000-1999', async () => {
    db.clickPages = [page(0, PAGE), page(PAGE, 3)];
    const out = await fetchOutboundClicks(since);
    expect(out.rows).toHaveLength(PAGE + 3);
    expect(out.truncated).toBe(false);
    expect(out.completeFrom).toBeNull();
    expect(db.rangeCalls).toEqual([[0, 999], [1000, 1999]]);
  });

  it('ne fait pas de page de trop quand le total est vide', async () => {
    const out = await fetchOutboundClicks(since);
    expect(out.rows).toEqual([]);
    expect(db.rangeCalls).toHaveLength(1);
  });

  it('tronque à MAX_PAGES pages pleines et indique à partir de quand les données sont complètes', async () => {
    db.clickPages = Array.from({ length: MAX_PAGES + 5 }, (_, p) => page(p * PAGE, PAGE));
    const out = await fetchOutboundClicks(since);
    expect(db.rangeCalls).toHaveLength(MAX_PAGES);
    expect(out.rows).toHaveLength(MAX_PAGES * PAGE);
    expect(out.truncated).toBe(true);
    // Le plus ancien clic lu : au-delà, on ne sait rien.
    expect(out.completeFrom).toBe(Math.min(...out.rows.map((r) => r.t)));
  });

  it('découpe les recherches de noms par lots et ne demande chaque id qu\'une fois', async () => {
    const n = LOOKUP_CHUNK * 2 + 50;
    db.clickPages = [{ data: [...Array.from({ length: n }, (_, i) => raw(i)), raw(0)], error: null }];
    db.events = Array.from({ length: n }, (_, i) => ({ id: `e${i}`, name: `Sortie ${i}` }));
    const out = await fetchOutboundClicks(since);
    expect(db.inCalls.map((c) => c.ids.length).sort((a, b) => b - a)).toEqual([LOOKUP_CHUNK, LOOKUP_CHUNK, 50]);
    expect(out.rows.find((r) => r.entityId === 'e7')?.name).toBe('Sortie 7');
  });

  it('la catégorie courante du lieu prime sur celle figée au clic, et une fiche supprimée n\'a pas de nom', async () => {
    db.clickPages = [{
      data: [
        raw(1, { entity_type: 'location', entity_id: 'l1', category: 'restaurant' }),
        raw(2, { entity_type: 'location', entity_id: 'l-supprime', category: 'cafe' }),
        raw(3, { entity_type: 'event', entity_id: 'e3', link_type: 'booking' }),
      ],
      error: null,
    }];
    db.locations = [{ id: 'l1', name: 'Parc', category: 'nature' }];
    const { rows } = await fetchOutboundClicks(since);
    expect(rows[0]).toMatchObject({ entityType: 'location', name: 'Parc', category: 'nature' });
    expect(rows[1]).toMatchObject({ name: null, category: 'cafe' });
    expect(rows[2]).toMatchObject({ entityType: 'event', linkType: 'booking' });
  });

  it('propage une erreur de lecture', async () => {
    db.clickPages = [{ data: null, error: { message: 'boom' } }];
    await expect(fetchOutboundClicks(since)).rejects.toEqual({ message: 'boom' });
  });
});
