import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEquipmentVotes(locationId: string) {
  return useQuery({
    queryKey: ['equipment-votes', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('contributions')
        .select('high_chair, changing_table, kids_area')
        .eq('location_id', locationId)
        .eq('status', 'validated');

      const votes = { high_chair: 0, changing_table: 0, kids_area: 0 };
      data?.forEach(c => {
        if (c.high_chair === true) votes.high_chair++;
        if (c.changing_table === true) votes.changing_table++;
        if (c.kids_area === true) votes.kids_area++;
      });
      return votes;
    },
  });
}
