import { useEffect } from 'react';

/**
 * Pose un `<meta name="robots" content="noindex, nofollow">` tant que le
 * composant appelant est monté — seul mécanisme dispo dans cette SPA (pas de
 * react-helmet, pas de rendu par route côté serveur). Complété par
 * `Disallow: /semaine/` dans `robots.txt`, plus fiable pour un crawler qui
 * n'exécute pas de JS. Un bot qui ignore les deux verrait quand même le HTML
 * brut un court instant — limite assumée d'une SPA sans SSR, pas fermable ici.
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}
