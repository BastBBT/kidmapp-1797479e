import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DuplicateCandidate } from '@/lib/duplicateLocation';

/** Au-delà, PostgREST coupe sans le dire (`max_rows` par défaut) : des lieux ne seraient plus comparés. */
const POSTGREST_DEFAULT_MAX_ROWS = 1000;

/**
 * Lieux publiés, réduits au nécessaire pour détecter un doublon à la proposition (formulaire) et à la
 * modération (admin). Chargés à la demande : `enabled` reste faux tant que le formulaire est fermé.
 * La clé vit sous `['locations']` : toute approbation ou publication d'un lieu invalide déjà ce
 * préfixe, sans quoi un lieu publié il y a moins de `staleTime` resterait invisible ici.
 */
export const useDuplicateCandidates = (enabled = true) =>
  useQuery({
    queryKey: ['locations', 'duplicate-candidates'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, photo')
        .eq('status', 'published')
        .limit(2000);
      if (error) throw error;
      const rows = (data ?? []) as DuplicateCandidate[];
      if (rows.length >= POSTGREST_DEFAULT_MAX_ROWS) {
        console.warn(`useDuplicateCandidates : ${rows.length} lieux reçus, la liste est peut-être tronquée (doublons non détectés au-delà).`);
      }
      return rows;
    },
  });
