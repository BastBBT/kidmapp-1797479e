import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClickRow, LinkType } from '@/components/admin/outboundWeeks';

export const PAGE = 1000;
/** Garde-fou : au-delà, on s'arrête plutôt que de boucler sur une table qui aurait explosé. */
export const MAX_PAGES = 30;
export const LOOKUP_CHUNK = 100;

const chunks = <T,>(list: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

export type OutboundClicks = {
  rows: ClickRow[];
  truncated: boolean;
  /**
   * Si la lecture a été tronquée : instant (ms) avant lequel les clics sont incomplets. On lit du
   * plus récent au plus ancien, donc la troncature n'abîme que les semaines les plus anciennes.
   * `null` quand tout a été lu.
   */
  completeFrom: number | null;
};

/**
 * Clics sortants depuis `since`, lus directement dans `link_clicks` (RLS : lecture admin) puis
 * enrichis du nom et de la catégorie courante des fiches. Le regroupement par semaine se fait côté
 * client : une semaine est une fenêtre libre, que l'ancienne RPC `admin_link_clicks_stats` (top 50
 * sur N jours glissants) ne sait pas exprimer.
 */
export async function fetchOutboundClicks(since: Date): Promise<OutboundClicks> {
  // Borne haute figée : sans elle, un clic arrivant pendant la lecture décalerait les pages
  // suivantes (tri décroissant) et ferait doubler une ligne.
  const until = new Date().toISOString();
  const raw: { entity_type: string; entity_id: string; category: string | null; link_type: string; created_at: string }[] = [];
  let truncated = false;
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) { truncated = true; break; }
    const { data, error } = await supabase
      .from('link_clicks')
      .select('entity_type, entity_id, category, link_type, created_at')
      .gte('created_at', since.toISOString())
      .lte('created_at', until)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) throw error;
    raw.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE) break;
  }

  const locationIds = [...new Set(raw.filter((r) => r.entity_type === 'location').map((r) => r.entity_id))];
  const eventIds = [...new Set(raw.filter((r) => r.entity_type === 'event').map((r) => r.entity_id))];

  const locations = new Map<string, { name: string; category: string | null }>();
  const events = new Map<string, { name: string }>();

  await Promise.all([
    ...chunks(locationIds, LOOKUP_CHUNK).map(async (ids) => {
      const { data, error } = await supabase.from('locations').select('id, name, category').in('id', ids);
      if (error) throw error;
      (data ?? []).forEach((l) => locations.set(l.id, { name: l.name, category: l.category }));
    }),
    ...chunks(eventIds, LOOKUP_CHUNK).map(async (ids) => {
      const { data, error } = await supabase.from('events').select('id, name').in('id', ids);
      if (error) throw error;
      (data ?? []).forEach((e) => events.set(e.id, { name: e.name }));
    }),
  ]);

  const rows: ClickRow[] = raw.map((r) => {
    const isEvent = r.entity_type === 'event';
    const loc = isEvent ? undefined : locations.get(r.entity_id);
    return {
      entityType: isEvent ? 'event' : 'location',
      entityId: r.entity_id,
      linkType: (r.link_type === 'booking' ? 'booking' : 'website') as LinkType,
      // La catégorie courante de la fiche prime sur celle figée au moment du clic.
      category: loc?.category ?? r.category,
      name: isEvent ? events.get(r.entity_id)?.name ?? null : loc?.name ?? null,
      t: new Date(r.created_at).getTime(),
    };
  });

  const completeFrom = truncated && rows.length > 0 ? Math.min(...rows.map((r) => r.t)) : null;
  return { rows, truncated, completeFrom };
}

export const useOutboundClicks = (since: Date, enabled = true) =>
  useQuery({
    queryKey: ['admin-outbound-clicks', since.getTime()],
    enabled,
    staleTime: 60 * 1000,
    queryFn: () => fetchOutboundClicks(since),
  });
