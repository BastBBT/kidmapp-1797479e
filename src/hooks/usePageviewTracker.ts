import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Logs one row in page_views per route change.
 * - Anonymous visitors: user_id = null (raw hit count, no dedup, no cookie).
 * - Authenticated visitors: user_id is filled.
 * Fire-and-forget; never blocks UI.
 */
export function usePageviewTracker() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    // Strip query/hash to avoid leaking tokens (e.g. OAuth fragment) — et le
    // jeton du digest hebdo, qui lui est dans le chemin (`/semaine/<token>`,
    // pas une query string) : sans ce cas particulier, un token qui donne
    // accès aux prénoms des enfants et au désabonnement du compte finirait en
    // clair dans `page_views` (rétention 12 mois, plus longue que la TTL de
    // 30 jours du jeton lui-même).
    const path = location.pathname.startsWith('/semaine/') ? '/semaine' : location.pathname;
    const key = `${path}|${user?.id ?? 'anon'}`;
    if (lastLoggedRef.current === key) return;
    lastLoggedRef.current = key;

    const referrer = typeof document !== 'undefined' ? document.referrer || null : null;

    supabase
      .from('page_views')
      .insert({
        path,
        referrer,
        user_id: user?.id ?? null,
      })
      .then(({ error }) => {
        if (error) console.debug('[pageview] insert failed', error.message);
      });
  }, [location.pathname, user?.id, isLoading]);
}
