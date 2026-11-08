import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EventItem, EventOccurrence } from '@/types/event';
import { isSpotlightFrequency, pickOccurrence, type SpotlightRule } from '@/lib/eventSpotlight';
import { todayISO } from '@/lib/weekend';

export interface ActiveSpotlight {
  rule: SpotlightRule;
  headline: string;
  message: string | null;
  showCalendarCta: boolean;
  showPhoto: boolean;
  event: EventItem;
  /** Créneau à venir d'une sortie à plusieurs dates, `null` sinon. */
  occurrence: EventOccurrence | null;
  /** Jour J : début de la sortie, ou de son prochain créneau. */
  eventDay: string;
}

/** Créneaux de la sortie. Repli silencieux : sans eux, on se fie aux dates de la sortie. */
const fetchOccurrences = async (eventId: string): Promise<EventOccurrence[]> => {
  try {
    const { data, error } = await supabase
      .from('event_occurrences')
      .select('*')
      .eq('event_id', eventId)
      .order('date_start', { ascending: true });
    if (error) return [];
    return (data ?? []) as unknown as EventOccurrence[];
  } catch {
    return [];
  }
};

/**
 * La mise en avant en cours la plus récente, avec sa sortie. Les règles d'accès ne montrent
 * au public que les mises en avant en cours dont la sortie est publiée, mais un admin voit tout :
 * la période est donc filtrée aussi ici, pour qu'une mise en avant planifiée ne masque pas
 * celle qui est en cours.
 */
export const useActiveSpotlight = () =>
  useQuery({
    queryKey: ['event-spotlight', 'active'],
    queryFn: async (): Promise<ActiveSpotlight | null> => {
      const today = todayISO();
      const { data, error } = await supabase
        .from('event_spotlights')
        .select('*, events(*)')
        .lte('starts_on', today)
        .gte('ends_on', today)
        .order('starts_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      const event = row?.events as unknown as EventItem | null | undefined;
      if (!row || !event || event.status !== 'published' || !isSpotlightFrequency(row.frequency)) return null;
      const occurrence = pickOccurrence(await fetchOccurrences(event.id), today);
      return {
        rule: {
          id: row.id,
          starts_on: row.starts_on,
          ends_on: row.ends_on,
          frequency: row.frequency,
          last_reminder: row.last_reminder,
        },
        headline: row.headline,
        message: row.message,
        showCalendarCta: row.show_calendar_cta,
        showPhoto: row.show_photo,
        event,
        occurrence,
        eventDay: occurrence?.date_start ?? event.date_start,
      };
    },
    // Une pop-in manquée vaut mieux qu'un accueil ralenti : pas de nouvel essai, et la décision
    // d'affichage n'a besoin que d'une lecture par visite.
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
