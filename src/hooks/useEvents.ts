import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventItem, EventOccurrence } from '@/types/event';
import { lastMondayISO, todayISO } from '@/lib/weekend';

export const useEvents = () => {
  return useQuery({
    queryKey: ['events', 'published-from-last-week'],
    queryFn: async () => {
      const since = lastMondayISO();
      const today = todayISO();
      // Include: events starting from last Monday onwards,
      // OR long-running events whose end date is still today or later.
      const { data, error } = await supabase
        .from('events' as any)
        .select('*')
        .eq('status', 'published')
        .or(`date_start.gte.${since},date_end.gte.${today}`)
        .order('date_start', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventItem[];
    },
  });
};

/**
 * Créneaux des events passés en paramètre, groupés par `event_id`.
 * Le calendrier en a besoin pour poser une pastille par créneau et non une par
 * event ; en cas d'échec il retombe sur les dates portées par l'event lui-même.
 */
export const useEventOccurrences = (eventIds: string[]) => {
  const ids = [...eventIds].sort();
  return useQuery({
    queryKey: ['event-occurrences', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_occurrences')
        .select('*')
        .in('event_id', ids)
        .order('date_start', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as EventOccurrence[];
      const map: Record<string, EventOccurrence[]> = {};
      for (const occ of rows) (map[occ.event_id] ??= []).push(occ);
      return map;
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
