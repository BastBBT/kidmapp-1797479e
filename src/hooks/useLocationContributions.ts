import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EquipKey } from '@/assets/icons';

export type ValidatedContribution = {
  id: string;
  location_id: string;
  user_id: string | null;
  content: string | null;
  high_chair: boolean | null;
  changing_table: boolean | null;
  kids_area: boolean | null;
  kids_menu: boolean | null;
  bookable: string | null;
  status: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export type EquipVoteCounts = Record<EquipKey, { yes: number; no: number }>;

export function useLocationContributions(locationId: string) {
  return useQuery({
    queryKey: ['location-contributions', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*, profiles(full_name)')
        .eq('location_id', locationId)
        .eq('status', 'validated')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const contributions = (data ?? []) as unknown as ValidatedContribution[];

      const votes: EquipVoteCounts = {
        high_chair: { yes: 0, no: 0 },
        changing_table: { yes: 0, no: 0 },
        kids_area: { yes: 0, no: 0 },
        kids_menu: { yes: 0, no: 0 },
      };
      let bookable_yes = 0;
      const contributors = new Set<string>();
      let commentCount = 0;

      for (const c of contributions) {
        (['high_chair', 'changing_table', 'kids_area', 'kids_menu'] as EquipKey[]).forEach((k) => {
          if (c[k] === true) votes[k].yes++;
          else if (c[k] === false) votes[k].no++;
        });
        if (c.bookable === 'yes') bookable_yes++;
        if (c.user_id) contributors.add(c.user_id);
        if (c.content && c.content.trim().length > 0) commentCount++;
      }

      return {
        contributions,
        votes,
        bookable_yes,
        contributorCount: contributors.size,
        commentCount,
      };
    },
  });
}
