import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useUserEmails } from './useUserEmails';
import { isBotEmail } from '@/lib/adminBot';

export type LocationProposalRow = Database['public']['Tables']['location_proposals']['Row'];

export type AdminProfileRow = {
  id: string;
  role: string;
  created_at: string;
  acquisition_source: string | null;
};

/**
 * Lecture unique de `profiles` (id/rôle/date d'inscription/source d'acquisition).
 * Sert aujourd'hui uniquement à `useAdminExcludedUserIds` (classement « top
 * contributeurs ») — le bloc stats du dashboard, qui relisait aussi cette table
 * de son côté, passe désormais par la RPC `admin_dashboard_stats` (agrégats
 * calculés en base). Avant cette consolidation, chaque bloc relisait la table
 * en entier séparément — jusqu'à six lectures intégrales quasi identiques par
 * ouverture de page, contribuant aux timeouts Postgres observés.
 */
export const useAdminProfiles = (enabled = true) => {
  return useQuery({
    queryKey: ['admin-profiles-overview'],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, created_at, acquisition_source');
      if (error) throw error;
      return (data ?? []) as AdminProfileRow[];
    },
  });
};

/** Lecture unique de `location_proposals`, pour le classement « top contributeurs » (les compteurs du dashboard passent par la RPC `admin_dashboard_stats`). */
export const useAdminLocationProposals = (enabled = true) => {
  return useQuery({
    queryKey: ['admin-location-proposals'],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_proposals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LocationProposalRow[];
    },
  });
};

/**
 * Ids à exclure des statistiques : comptes admin + compte bot de sourcing
 * (résolu par email). Composé sur `useAdminProfiles` + `useUserEmails`, qui
 * dédoublonne déjà l'appel à l'edge function par liste d'ids — un seul appel
 * réseau au lieu d'un par consommateur.
 */
export const useAdminExcludedUserIds = (enabled = true) => {
  const { data: profiles = [] } = useAdminProfiles(enabled);
  const nonAdminIds = useMemo(
    () => profiles.filter((p) => p.role !== 'admin').map((p) => p.id),
    [profiles]
  );
  const { data: emails = {} } = useUserEmails(nonAdminIds, enabled && nonAdminIds.length > 0);

  return useMemo(() => {
    const excludedIds = new Set<string>(profiles.filter((p) => p.role === 'admin').map((p) => p.id));
    for (const [uid, email] of Object.entries(emails)) {
      if (isBotEmail(email)) excludedIds.add(uid);
    }
    return excludedIds;
  }, [profiles, emails]);
};
