import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MealType = {
  id: string;
  label: string;
  short_label: string;
  emoji: string;
  default_time_start: string | null;
  default_time_end: string | null;
  default_days: string | null;
  color_hex: string | null;
  fill_hex: string | null;
  bg_hex: string | null;
  sort_order: number | null;
};

export type LocationMeal = {
  id: string;
  location_id: string;
  meal_type_id: string;
  time_open: string | null;
  time_close: string | null;
  is_confirmed: boolean;
  confirmed_count: number;
  created_by: string | null;
  created_at: string;
};

// Fetch the 5 meal types once (long cache)
export const useMealTypes = () => {
  return useQuery({
    queryKey: ['meal_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MealType[];
    },
    staleTime: 1000 * 60 * 60, // 1h
  });
};

// All location_meals (used to filter the explore list and show emojis on cards)
export const useAllLocationMeals = () => {
  return useQuery({
    queryKey: ['location_meals', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('location_meals').select('*');
      if (error) throw error;
      return (data ?? []) as LocationMeal[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Meals for a single location (joined with meal_types)
export const useLocationMeals = (locationId?: string) => {
  return useQuery({
    queryKey: ['location_meals', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_meals')
        .select('*, meal_types(*)')
        .eq('location_id', locationId!);
      if (error) throw error;
      return (data ?? []) as (LocationMeal & { meal_types: MealType })[];
    },
  });
};
