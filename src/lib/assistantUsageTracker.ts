import { supabase } from '@/integrations/supabase/client';

/**
 * Compte les ouvertures et les sessions menées à leur terme, pour mesurer
 * l'adoption de l'assistant mascotte d'Explorer. « Terminé » vs « abandonné »
 * est la différence entre les deux compteurs — pas de suivi question par
 * question. Miroir de `AssistantUsageTracker` (iOS et Android).
 *
 * RPC `SECURITY DEFINER` (`record_assistant_opened` / `record_assistant_completed`,
 * migration confirmée côté Lovable) qui incrémentent pour `auth.uid()` — pas de
 * lecture-puis-écriture ici, pour rester correct si l'assistant est rouvert
 * depuis deux appareils. Un visiteur non connecté n'a pas le droit d'exécution :
 * l'échec est attendu (pas de compte tenu), best-effort et silencieux comme
 * `OnboardingTracker`.
 */
export const recordAssistantOpened = async () => {
  try {
    const { error } = await supabase.rpc('record_assistant_opened');
    if (error) throw error;
  } catch {
    // Silencieux et sans retry : la prochaine ouverture recomptera.
  }
};

export const recordAssistantCompleted = async () => {
  try {
    const { error } = await supabase.rpc('record_assistant_completed');
    if (error) throw error;
  } catch {
    // Silencieux et sans retry.
  }
};
