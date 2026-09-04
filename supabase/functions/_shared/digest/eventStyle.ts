/**
 * Emoji par catégorie d'event — duplication délibérée et minime de
 * `src/types/event.ts` (côté client web), pas un import direct : une Edge
 * Function ne peut pas dépendre du bundle `src/` du client, même pattern que
 * les autres petits helpers de `_shared/`.
 */
const CATEGORY_EMOJI: Record<string, string> = {
  Spectacle: '🎭',
  Atelier: '🎨',
  Festival: '🎪',
  'Fête': '🎉',
  Fete: '🎉',
  'Marché': '🧺',
  Marche: '🧺',
  Exposition: '🖼️',
  Autre: '📅',
}

export function eventCategoryEmoji(category?: string | null): string {
  return (category && CATEGORY_EMOJI[category]) || '📅'
}
