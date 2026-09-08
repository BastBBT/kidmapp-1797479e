/**
 * Emoji par catégorie de lieu — même patron et même raison que
 * `eventStyle.ts` (duplication délibérée et minime de la liste utilisée dans
 * `AdminPage.tsx`, une Edge Function ne dépend pas du bundle `src/` client).
 */
const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  shop: '🛍️',
  public: '🌳',
  coiffeur: '✂️',
  librairie: '📚',
  nature: '🌿',
  sport: '⚽',
  creatif: '🎨',
  culture: '🏛️',
  jeux: '🎲',
}

export function locationCategoryEmoji(category?: string | null): string {
  return (category && CATEGORY_EMOJI[category]) || '📍'
}
