import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type Verdict = 'up' | 'down';

export interface EventFeedbackRow {
  id: string;
  event_id: string;
  user_id: string;
  verdict: Verdict;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export const useEventFeedback = (eventId: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['event-feedback', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_feedback' as any)
        .select('verdict')
        .eq('event_id', eventId);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { verdict: Verdict }[];
      const up = rows.filter((r) => r.verdict === 'up').length;
      const down = rows.filter((r) => r.verdict === 'down').length;
      return { up, down };
    },
  });

  const mineQuery = useQuery({
    queryKey: ['event-feedback', 'mine', eventId, user?.id],
    enabled: !!eventId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_feedback' as any)
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as EventFeedbackRow) ?? null;
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ verdict, comment }: { verdict: Verdict; comment?: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const payload = {
        event_id: eventId,
        user_id: user.id,
        verdict,
        comment: comment?.trim() ? comment.trim().slice(0, 2000) : null,
      };
      const { data, error } = await supabase
        .from('event_feedback' as any)
        .upsert(payload, { onConflict: 'event_id,user_id' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as EventFeedbackRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-feedback', eventId] });
      qc.invalidateQueries({ queryKey: ['event-feedback', 'mine', eventId, user?.id] });
    },
  });

  return {
    counts: listQuery.data ?? { up: 0, down: 0 },
    mine: mineQuery.data ?? null,
    isLoading: listQuery.isLoading || mineQuery.isLoading,
    upsert,
  };
};

export const useEventFeedbackList = (eventId: string, enabled = true) => {
  return useQuery({
    queryKey: ['event-feedback', 'admin-list', eventId],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_feedback' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventFeedbackRow[];
    },
  });
};
