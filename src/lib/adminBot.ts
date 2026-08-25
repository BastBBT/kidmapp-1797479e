/**
 * Compte bot utilisé pour le sourcing interne d'événements.
 * Il est exclu de tous les compteurs statistiques du dashboard admin.
 */
export const BOT_SOURCING_EMAIL = 'bastien.boubat+event@gmail.com';

export const isBotEmail = (email: string | null | undefined) =>
  !!email && email.toLowerCase() === BOT_SOURCING_EMAIL;
