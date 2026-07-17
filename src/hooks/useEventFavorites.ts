import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useEventFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteEventIds = [] } = useQuery({
    queryKey: ['event-favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_favorites' as any)
        .select('event_id')
        .eq('user_id', user!.id);
      return (data ?? []).map((f: any) => f.event_id) as string[];
    },
  });

  const isFavorite = (eventId: string) => favoriteEventIds.includes(eventId);

  const toggleFavorite = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) return;
      if (isFavorite(eventId)) {
        await supabase
          .from('event_favorites' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);
      } else {
        await supabase
          .from('event_favorites' as any)
          .insert({ user_id: user.id, event_id: eventId } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-favorites', user?.id] });
    },
  });

  return { favoriteEventIds, isFavorite, toggleFavorite };
}
