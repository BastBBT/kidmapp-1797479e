import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Location, LocationCategory } from '@/types/location';

export const useLocations = (category?: LocationCategory | 'all') => {
  return useQuery({
    queryKey: ['locations', category],
    queryFn: async () => {
      let query = supabase.from('locations').select('*').eq('status', 'published').limit(2000);
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Location[];
    },
  });
};

export const useLocation = (id: string) => {
  return useQuery({
    queryKey: ['location', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Location;
    },
    enabled: !!id,
  });
};

export const useAllLocations = (enabled = true) => {
  return useQuery({
    queryKey: ['all-locations'],
    enabled,
    queryFn: async () => {
      // Admin view: use service role or just fetch all (RLS will filter)
      // For now we read published only from client; admin needs separate policy
      const { data, error } = await supabase.from('locations').select('*').limit(2000);
      if (error) throw error;
      return data as Location[];
    },
  });
};

export const useContributions = (enabled = true) => {
  return useQuery({
    queryKey: ['contributions'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
  });
};
