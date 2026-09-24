import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Pages d'atterrissage par email dont le chemin porte un jeton
// (`/semaine/<token>`, `/nouveaux-lieux/<token>`) — jamais une query string.
// Un jeton qui fuit ici donne accès au désabonnement du compte (et aux
// prénoms des enfants pour `/semaine/`), et `page_views` a une rétention de
// 12 mois, plus longue que la TTL de 30 jours du jeton lui-même.
const TOKEN_LANDING_PREFIXES = ['/semaine/', '/nouveaux-lieux/'];

function stripTokenPrefix(pathname: string): string {
  const hit = TOKEN_LANDING_PREFIXES.find((p) => pathname.startsWith(p));
  return hit ? hit.slice(0, -1) : pathname;
}

/**
 * Le token ne fuit pas seulement par le chemin visité : si on clique un lien
 * interne depuis une page d'atterrissage (ex. une carte de lieu), le
 * `document.referrer` de la page suivante contient l'URL complète d'origine,
 * jeton inclus — trouvé à l'audit /check-pr de la PR #48. On tronque à
 * l'origine dans ce cas précis, plutôt que de dépouiller tout referrer.
 */
function sanitizeReferrer(referrer: string | null): string | null {
  if (!referrer) return referrer;
  try {
    const url = new URL(referrer);
    if (TOKEN_LANDING_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return url.origin;
    }
    return referrer;
  } catch {
    // document.referrer mal formé (rare, navigateurs non standards) — ne
    // bloque jamais le tracking pour ça, on renvoie tel quel.
    return referrer;
  }
}

const DEVICE_ID_KEY = 'kidmapp.audience.deviceId';
const SESSION_KEY = 'kidmapp.audience.session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Identifiant anonyme de mesure d'audience, tiré au hasard et gardé dans le
 * navigateur (déclaré dans la politique de confidentialité, section « Mesure
 * d'audience »). Sert à compter les visiteurs uniques, non connectés compris,
 * dans l'onglet Audience de l'admin. `null` si le stockage est indisponible
 * (navigation privée stricte, stockage bloqué) : la visite est alors comptée
 * sans être dédupliquée.
 */
export function getDeviceId(): string | null {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

/**
 * Session = suite de pages vues sans trou de plus de 30 min — même règle que
 * les apps iOS/Android, pour que les « sessions » se comparent d'une plateforme
 * à l'autre. Partagée entre onglets (localStorage), comme une visite.
 */
/** Valeur illisible = pas de session : on en ouvre une neuve qui l'écrase, au lieu de
 *  laisser le `JSON.parse` échouer à chaque page et renvoyer `null` pour toujours. */
function readSession(raw: string | null): { id?: string; lastSeen?: number } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id?: string; lastSeen?: number };
  } catch {
    return null;
  }
}

export function getSessionId(): string | null {
  try {
    const now = Date.now();
    const current = readSession(localStorage.getItem(SESSION_KEY));
    const id =
      current?.id && typeof current.lastSeen === 'number' && now - current.lastSeen < SESSION_TIMEOUT_MS
        ? current.id
        : crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastSeen: now }));
    return id;
  } catch {
    return null;
  }
}

/**
 * Logs one row in page_views per route change.
 * - Anonymous visitors: user_id = null (no cookie; deduplicated by device_id).
 * - Authenticated visitors: user_id is filled.
 * - Every row carries platform = 'web', an anonymous device_id and a session_id.
 * Fire-and-forget; never blocks UI.
 */
export function usePageviewTracker() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const lastLoggedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    // Strip query/hash to avoid leaking tokens (e.g. OAuth fragment).
    const path = stripTokenPrefix(location.pathname);
    const key = `${path}|${user?.id ?? 'anon'}`;
    if (lastLoggedRef.current === key) return;
    lastLoggedRef.current = key;

    const referrer = sanitizeReferrer(typeof document !== 'undefined' ? document.referrer || null : null);

    supabase
      .from('page_views')
      .insert({
        path,
        referrer,
        user_id: user?.id ?? null,
        platform: 'web',
        device_id: getDeviceId(),
        session_id: getSessionId(),
      })
      .then(({ error }) => {
        if (error) console.debug('[pageview] insert failed', error.message);
      });
  }, [location.pathname, user?.id, isLoading]);
}
