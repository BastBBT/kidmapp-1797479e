import { supabase } from '@/integrations/supabase/client';

/**
 * Enregistre un clic sortant vers le site web d'un lieu / activité / événement.
 * Volontairement « fire and forget » : une erreur ne doit jamais empêcher
 * l'ouverture du lien. Seuls les liens `website`/`booking_url` sont trackés
 * (ni Instagram, ni reels).
 *
 * `linkType` distingue le site web classique (`'website'`, valeur par défaut) du lien
 * de réservation/billetterie (`'booking'`) — seules les sorties portent ce second lien.
 */
export const trackLinkClick = (params: {
  entityType: 'location' | 'event';
  entityId: string;
  url: string;
  category?: string | null;
  linkType?: 'website' | 'booking';
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
        link_type: params.linkType ?? 'website',
      });
    } catch {
      /* silencieux */
    }
  })();
};
