import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Admin-only. Resolves user_id → email via edge function.
 * Returns a Record map keyed by user_id.
 */
export function useUserEmails(userIds: (string | null | undefined)[], enabled = true) {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x))).sort();
  const key = ids.join(',');

  return useQuery({
    queryKey: ['admin-user-emails', key],
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-list-user-emails', {
        body: { user_ids: ids },
      });
      if (error) throw error;
      return (data?.emails ?? {}) as Record<string, string>;
    },
  });
}
