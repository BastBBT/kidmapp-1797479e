import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventItem } from '@/types/event';
import { lastMondayISO } from '@/lib/weekend';

export const useEvents = () => {
  return useQuery({
    queryKey: ['events', 'published-from-last-week'],
    queryFn: async () => {
      const since = lastMondayISO();
      const { data, error } = await supabase
        .from('events' as any)
        .select('*')
        .eq('status', 'published')
        .or(`date_end.gte.${since},and(date_end.is.null,date_start.gte.${since})`)
        .order('date_start', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventItem[];
    },
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ['event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EventItem | null;
    },
  });
};

export const useAllEvents = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['events', 'all'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventItem[];
    },
  });
};

export const useMyEvents = (userId?: string) => {
  return useQuery({
    queryKey: ['my-events', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events' as any)
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventItem[];
    },
  });
};
