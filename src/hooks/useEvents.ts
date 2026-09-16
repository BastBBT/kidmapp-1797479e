import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventItem, EventOccurrence, hasRecurrence } from '@/types/event';
import { isPastEvent, lastMondayISO, todayISO } from '@/lib/weekend';
import { eventsWindowFilter, occurrencesOf } from '@/lib/eventCalendar';

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
        .order('date_start', { ascending: true })
        .limit(2000);
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
        .order('created_at', { ascending: false })
        .limit(2000);
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

/**
 * Créneaux des events donnés, groupés par `event_id` — même requête que
 * `useEventOccurrences`, mais en fonction simple plutôt qu'en hook pour rester
 * appelable depuis un `queryFn` (la règle des hooks React interdirait
 * d'appeler un autre hook conditionnellement, une fois les ids connus).
 */
const fetchOccurrencesByEventId = async (eventIds: string[]): Promise<Record<string, EventOccurrence[]>> => {
  if (eventIds.length === 0) return {};
  const { data, error } = await supabase
    .from('event_occurrences')
    .select('*')
    .in('event_id', eventIds)
    .order('date_start', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as EventOccurrence[];
  const map: Record<string, EventOccurrence[]> = {};
  for (const occ of rows) (map[occ.event_id] ??= []).push(occ);
  return map;
};

/** Une sortie liée à un lieu, avec le créneau à afficher pour une sortie
 * ponctuelle (absent pour un rendez-vous récurrent, qui affiche son tampon de
 * cadence plutôt qu'une date). */
export interface LocationLinkedEvent {
  event: EventItem;
  occurrence?: EventOccurrence;
}

/**
 * Sorties liées à un lieu donné, dans cet ordre : les rendez-vous installés
 * (cadence saisie — LAEP, atelier hebdo) toujours renvoyés même si leur
 * dernière date connue est passée, puisqu'ils représentent un fonctionnement
 * permanent ; puis les sorties ponctuelles liées au lieu mais seulement
 * celles dont une occurrence est encore à venir.
 *
 * `events.date_start` ne suffit pas à en juger : un trigger le fige sur la
 * toute première occurrence à l'insertion et ne le remet jamais à jour une
 * fois celle-ci passée (même piège documenté dans `EventCard.tsx`) — un
 * atelier tenu plusieurs fois (ex. « gratuit le 1er dimanche du mois »)
 * resterait donc marqué passé pour toujours dès sa première séance écoulée.
 * On regarde `event_occurrences` directement pour choisir la prochaine date.
 */
export const useRecurringEventsAtLocation = (locationId: string) => {
  return useQuery({
    queryKey: ['recurring-events', locationId],
    enabled: !!locationId,
    queryFn: async (): Promise<LocationLinkedEvent[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('location_id', locationId)
        .eq('status', 'published')
        .order('name', { ascending: true });
      if (error) throw error;
      const all = (data ?? []) as unknown as EventItem[];

      const recurring: LocationLinkedEvent[] = all.filter(hasRecurrence).map((event) => ({ event }));

      const oneOff = all.filter((e) => !hasRecurrence(e));
      const occurrencesByEvent = await fetchOccurrencesByEventId(oneOff.map((e) => e.id));
      const upcomingOneOff = oneOff
        .map((event) => {
          const nextOccurrence = occurrencesOf(event, occurrencesByEvent)
            .filter((occ) => !isPastEvent(occ.date_start, occ.date_end))
            .sort((a, b) => a.date_start.localeCompare(b.date_start))[0];
          return nextOccurrence ? { event, occurrence: nextOccurrence } : null;
        })
        .filter((item): item is { event: EventItem; occurrence: EventOccurrence } => item !== null)
        .sort((a, b) => a.occurrence.date_start.localeCompare(b.occurrence.date_start));

      return [...recurring, ...upcomingOneOff];
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
