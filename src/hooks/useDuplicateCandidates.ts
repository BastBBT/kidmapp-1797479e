import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DuplicateCandidate } from '@/lib/duplicateLocation';

/**
 * Lieux publiés, réduits au nécessaire pour détecter un doublon à la proposition (formulaire) et à la
 * modération (admin). Chargés à la demande : `enabled` reste faux tant que le formulaire est fermé.
 */
export const useDuplicateCandidates = (enabled = true) =>
  useQuery({
    queryKey: ['duplicate-candidates'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, photo')
        .eq('status', 'published')
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as DuplicateCandidate[];
    },
  });
