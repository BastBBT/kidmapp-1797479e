import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('favorites')
        .select('location_id')
        .eq('user_id', user!.id);
      return data?.map((f: any) => f.location_id) ?? [];
    }
  });

  const isFavorite = (locationId: string) =>
    favoriteIds.includes(locationId);

  const toggleFavorite = useMutation({
    mutationFn: async (locationId: string) => {
      if (isFavorite(locationId)) {
        await supabase.from('favorites').delete()
          .eq('user_id', user!.id)
          .eq('location_id', locationId);
      } else {
        await supabase.from('favorites').insert({
          user_id: user!.id,
          location_id: locationId
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    }
  });

  return { favoriteIds, isFavorite, toggleFavorite };
}
