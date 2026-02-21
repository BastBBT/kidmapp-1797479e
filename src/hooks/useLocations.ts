import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Location, LocationCategory } from '@/types/location';

export const useLocations = (category?: LocationCategory | 'all') => {
  return useQuery({
    queryKey: ['locations', category],
    queryFn: async () => {
      let query = supabase.from('locations').select('*');
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

export const useAllLocations = () => {
  return useQuery({
    queryKey: ['all-locations'],
    queryFn: async () => {
      // Admin view: use service role or just fetch all (RLS will filter)
      // For now we read published only from client; admin needs separate policy
      const { data, error } = await supabase.from('locations').select('*');
      if (error) throw error;
      return data as Location[];
    },
  });
};

export const useContributions = () => {
  return useQuery({
    queryKey: ['contributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
