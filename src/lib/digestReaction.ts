export type ReactionKey = 'love' | 'neutral' | 'sad';

export const REACTIONS: { key: ReactionKey; emoji: string }[] = [
  { key: 'love', emoji: '😍' },
  { key: 'neutral', emoji: '😐' },
  { key: 'sad', emoji: '🙁' },
];

/**
 * Le verdict cliqué dans le mail arrive en `?r=`. On le pré-sélectionne, on ne
 * l'enregistre jamais tout seul : un antivirus de messagerie qui précharge le
 * lien voterait sinon à la place du parent. C'est aussi ce qui protège du tap
 * accidentel — le serveur refuse d'écraser une réaction déjà posée, donc un
 * clic direct était définitif.
 *
 * Toute valeur inconnue est traitée comme une absence de choix : le bouton de
 * confirmation reste désactivé, rien n'est présélectionné.
 */
export function suggestedReaction(raw: string | null): ReactionKey | null {
  return REACTIONS.find((r) => r.key === raw)?.key ?? null;
}
