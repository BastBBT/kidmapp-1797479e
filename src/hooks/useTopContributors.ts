import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TopEntry = {
  user_id: string;
  total: number;
  approved: number;
};

export type TopContributorsData = {
  proposals: TopEntry[];
  contributions: TopEntry[];
};

/**
 * Aggregates top 5 contributors (location_proposals) and top 5 (contributions),
 * excluding admin accounts. Admin-only hook.
 */
export function useTopContributors(enabled = true) {
  return useQuery({
    queryKey: ['admin-top-contributors'],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TopContributorsData> => {
      const [adminsRes, proposalsRes, contributionsRes] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'admin'),
        supabase.from('location_proposals' as any).select('user_id, status'),
        supabase.from('contributions').select('user_id, status'),
      ]);

      const adminIds = new Set<string>(((adminsRes.data ?? []) as any[]).map((p) => p.id));

      const aggregate = (
        rows: { user_id: string | null; status: string | null }[],
        approvedStatuses: string[],
      ): TopEntry[] => {
        const map = new Map<string, TopEntry>();
        for (const r of rows) {
          if (!r.user_id || adminIds.has(r.user_id)) continue;
          const existing = map.get(r.user_id) ?? { user_id: r.user_id, total: 0, approved: 0 };
          existing.total += 1;
          if (r.status && approvedStatuses.includes(r.status)) existing.approved += 1;
          map.set(r.user_id, existing);
        }
        return Array.from(map.values())
          .sort((a, b) => b.total - a.total || b.approved - a.approved)
          .slice(0, 5);
      };

      return {
        proposals: aggregate(
          ((proposalsRes.data ?? []) as any[]) as { user_id: string | null; status: string | null }[],
          ['approved'],
        ),
        contributions: aggregate(
          ((contributionsRes.data ?? []) as any[]) as { user_id: string | null; status: string | null }[],
          ['validated'],
        ),
      };
    },
  });
}
