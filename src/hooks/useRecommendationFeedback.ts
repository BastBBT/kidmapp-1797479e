import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { useChildren } from './useChildren';

export type FeedbackVerdict = 'up' | 'down';

interface VerdictMaps {
  locations: Record<string, FeedbackVerdict>;
  events: Record<string, FeedbackVerdict>;
}

const EMPTY_MAPS: VerdictMaps = { locations: {}, events: {} };

/**
 * Feedback par item (👍 / 👎) — signal distinct du ♥ favori : le favori dit
 * « je veux le retrouver », le pouce dit « c'est le genre de truc pour nous ».
 * C'est de lui que l'affinité par attribut sera dérivée (elle triera, sans
 * jamais filtrer). À ne pas confondre avec `useEventFeedback`, qui recueille
 * un commentaire libre après un événement.
 *
 * Proposé seulement aux parents ayant au moins un enfant enregistré : sans
 * enfant, le signal n'a rien à alimenter.
 */
export function useRecommendationFeedback() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { children: kids } = useChildren();
  const queryClient = useQueryClient();
  const queryKey = ['recommendation-feedback', user?.id];
  const enabled = !!user && kids.length > 0;

  const { data = EMPTY_MAPS } = useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<VerdictMaps> => {
      const { data, error } = await supabase
        .from('recommendation_feedback')
        .select('location_id, event_id, verdict')
        .eq('user_id', user!.id);
      if (error) throw error;
      const maps: VerdictMaps = { locations: {}, events: {} };
      for (const row of data ?? []) {
        const verdict = row.verdict === 'up' || row.verdict === 'down' ? row.verdict : null;
        if (!verdict) continue;
        if (row.location_id) maps.locations[row.location_id] = verdict;
        if (row.event_id) maps.events[row.event_id] = verdict;
      }
      return maps;
    },
  });

  const toggleMutation = useMutation({
    /**
     * Toujours `delete` d'abord, puis `insert` seulement si le verdict tapé
     * diffère du précédent — retaper le même pouce efface l'avis. Jamais
     * d'upsert : la table n'a aucun index unique sur (user_id, cible), rien
     * n'y empêcherait les doublons.
     */
    mutationFn: async ({ locationId, eventId, verdict }: { locationId?: string; eventId?: string; verdict: FeedbackVerdict }) => {
      const current = locationId ? data.locations[locationId] : eventId ? data.events[eventId] : undefined;

      let deleteQuery = supabase.from('recommendation_feedback').delete().eq('user_id', user!.id);
      if (locationId) deleteQuery = deleteQuery.eq('location_id', locationId);
      if (eventId) deleteQuery = deleteQuery.eq('event_id', eventId);
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      if (current === verdict) return;

      const { error: insertError } = await supabase.from('recommendation_feedback').insert({
        user_id: user!.id,
        location_id: locationId ?? null,
        event_id: eventId ?? null,
        verdict,
        source: 'web',
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    // Un avis qu'on croit enregistré alors qu'il ne l'est pas est pire qu'une
    // erreur visible : le `GRANT DELETE` de cette table a déjà manqué une
    // fois, l'échec ne doit jamais être avalé silencieusement.
    onError: () => toast({ title: t('feedback.error'), variant: 'destructive' }),
  });

  return {
    enabled,
    locationVerdict: (id: string): FeedbackVerdict | undefined => data.locations[id],
    eventVerdict: (id: string): FeedbackVerdict | undefined => data.events[id],
    toggleLocation: (locationId: string, verdict: FeedbackVerdict) => toggleMutation.mutate({ locationId, verdict }),
    toggleEvent: (eventId: string, verdict: FeedbackVerdict) => toggleMutation.mutate({ eventId, verdict }),
  };
}
