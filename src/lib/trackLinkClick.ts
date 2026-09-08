import { supabase } from '@/integrations/supabase/client';

/**
 * Enregistre un clic sortant vers le site web d'un lieu / activité / événement.
 * Volontairement « fire and forget » : une erreur ne doit jamais empêcher
 * l'ouverture du lien. Seul le champ `website` est tracké (ni Instagram, ni reels).
 */
export const trackLinkClick = (params: {
  entityType: 'location' | 'event';
  entityId: string;
  url: string;
  category?: string | null;
}) => {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      await supabase.from('link_clicks').insert({
        entity_type: params.entityType,
        entity_id: params.entityId,
        category: params.category ?? null,
        url: params.url,
        platform: 'web',
        user_id: data.user?.id ?? null,
      });
    } catch {
      /* silencieux */
    }
  })();
};
