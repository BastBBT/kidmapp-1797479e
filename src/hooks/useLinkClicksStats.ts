import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LinkClickStatRow = {
  entity_type: 'location' | 'event';
  entity_id: string;
  name: string | null;
  category: string | null;
  website: string | null;
  /** Lien de réservation — toujours `null` pour un lieu, les lieux n'en ont pas. */
  booking_url: string | null;
  /** Type de lien cliqué : `'website'` (site classique) ou `'booking'` (réservation). Une
   * fiche avec des clics des deux types donne deux lignes distinctes, une par type. */
  link_type: 'website' | 'booking';
  click_count: number;
};

/** Classement des fiches les plus cliquées vers leur site web ou leur lien de réservation (admin only). */
export const useLinkClicksStats = (days: number, enabled = true) =>
  useQuery({
    queryKey: ['admin-link-clicks-stats', days],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_link_clicks_stats', { p_days: days });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        click_count: Number(r.click_count),
      })) as LinkClickStatRow[];
    },
  });
