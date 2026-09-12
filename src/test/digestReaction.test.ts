import { describe, it, expect } from 'vitest';
import { REACTIONS, suggestedReaction } from '@/lib/digestReaction';

// Le verdict arrive du mail par `?r=`. Il n'est que pré-sélectionné : la page
// exige ensuite un clic de confirmation, sinon un antivirus de messagerie qui
// précharge le lien voterait à la place du parent. Ce test verrouille la seule
// règle pure de ce mécanisme — ce qui est accepté comme verdict, et ce qui doit
// retomber sur « aucun choix ».

describe('verdict transmis par le lien du mail hebdo', () => {
  it('accepte les trois verdicts du mail', () => {
    expect(REACTIONS.map((r) => r.key)).toEqual(['love', 'neutral', 'sad']);
    for (const { key } of REACTIONS) {
      expect(suggestedReaction(key)).toBe(key);
    }
  });

  it('ignore un lien sans verdict', () => {
    expect(suggestedReaction(null)).toBeNull();
    expect(suggestedReaction('')).toBeNull();
  });

  it('ignore un verdict inconnu ou mal casé plutôt que de le présélectionner', () => {
    expect(suggestedReaction('nimportequoi')).toBeNull();
    expect(suggestedReaction('LOVE')).toBeNull();
    expect(suggestedReaction('love ')).toBeNull();
  });
});
