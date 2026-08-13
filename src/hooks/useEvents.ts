import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventItem, EventOccurrence } from '@/types/event';
import { lastMondayISO, todayISO } from '@/lib/weekend';
import { eventsWindowFilter } from '@/lib/eventCalendar';

/**
 * Ids des events ayant au moins un *créneau* dans la fenêtre d'affichage.
 *
 * Les dates portées par l'event ne suffisent pas à décider quoi charger : elles
 * sont synchronisées sur le créneau le plus proche *au moment de l'écriture*, et
 * le trigger n'est jamais rejoué au fil du temps. Un spectacle dont les dates
 * proches sont passées mais qui rejoue dans trois mois garde donc une date
 * périmée, sort du filtre, et ses créneaux lointains deviennent invisibles
 * partout — liste comme calendrier.
 */
const eventIdsWithOccurrence = async (since: string, today: string): Promise<string[]> => {
  // Repli silencieux : on garde le seul filtre porté par l'event. Mieux vaut la
  // liste d'avant que pas de liste du tout — d'où le catch, et pas seulement le
  // test sur `error` : une coupure réseau rejette la promesse au lieu de
  // renseigner `error`, et ferait échouer tout le chargement des sorties.
  try {
    const { data, error } = await supabase
      .from('event_occurrences')
      .select('event_id')
      // Même fenêtre que les events, appliquée au créneau.
      .or(`date_start.gte.${since},date_end.gte.${today}`);
    if (error) return [];
    const ids = new Set((data ?? []).map((row) => (row as { event_id: string }).event_id));
    return [...ids].sort();
  } catch {
    return [];
  }
};

export const useEvents = () => {
  return useQuery({
    queryKey: ['events', 'published-from-last-week'],
    queryFn: async () => {
      const since = lastMondayISO();
      const today = todayISO();
      const idsWithOccurrence = await eventIdsWithOccurrence(since, today);
      const filter = eventsWindowFilter(since, today, idsWithOccurrence);
      const { data, error } = await supabase
        .from('events' as any)
        .select('*')
        .eq('status', 'published')
        .or(filter)
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

/** Créneaux d'un seul event, pour la fiche détail. */
export const useOccurrencesForEvent = (eventId: string) => {
  return useQuery({
    queryKey: ['event-occurrences', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_occurrences')
        .select('*')
        .eq('event_id', eventId)
        .order('date_start', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventOccurrence[];
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
