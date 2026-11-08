import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, getSessionId } from '@/hooks/usePageviewTracker';

export type SpotlightLogKind = 'shown' | 'open' | 'calendar' | 'dismiss';

/**
 * Journalise ce que fait un parent d'une mise en avant (une ligne par événement).
 * Fire-and-forget, comme les pages vues : ne bloque jamais l'interface. `device_id` part
 * toujours quand le stockage le permet : c'est lui qui compte les spectateurs uniques.
 */
export const logSpotlight = (params: {
  spotlightId: string;
  kind: SpotlightLogKind;
  isLast: boolean;
  userId: string | null;
}): void => {
  try {
    supabase
      .from('event_spotlight_logs')
      .insert({
        spotlight_id: params.spotlightId,
        kind: params.kind,
        is_last: params.isLast,
        platform: 'web',
        device_id: getDeviceId(),
        session_id: getSessionId(),
        user_id: params.userId,
      })
      .then(({ error }) => {
        if (error) console.debug('[spotlight] log failed', error.message);
      });
  } catch (e) {
    console.debug('[spotlight] log failed', e);
  }
};
