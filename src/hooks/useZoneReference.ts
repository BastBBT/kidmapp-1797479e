import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ZoneReference } from '@/lib/zones';

const byLabel = (a: ZoneReference, b: ZoneReference) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });

/**
 * `zones_reference` est une petite table statique (~58 lignes) en lecture
 * publique (anon + authenticated) : un long `staleTime` évite de la
 * re-fetcher à chaque montage d'écran.
 */
export function useZoneReference() {
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones-reference'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones_reference')
        .select('label, kind, lat, lng');
      if (error) throw error;
      return (data ?? []) as ZoneReference[];
    },
  });

  const communes = useMemo(() => zones.filter((z) => z.kind === 'commune').sort(byLabel), [zones]);
  const quartiers = useMemo(() => zones.filter((z) => z.kind === 'quartier').sort(byLabel), [zones]);
  const secteurs = useMemo(() => zones.filter((z) => z.kind === 'secteur').sort(byLabel), [zones]);

  return { zones, communes, quartiers, secteurs, isLoading };
}
