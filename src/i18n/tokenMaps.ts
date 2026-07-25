import i18n from '@/i18n';

/**
 * Traduit un "token" stable (en français, tel que stocké en base) vers le libellé
 * de la langue active. Repli sur le texte brut si la clé n'est pas mappée — pour
 * ne jamais rien casser si un nouveau token apparaît côté DB.
 *
 * @example translateToken('category_place', 'restaurant') → 'Restaurant' | 'Restaurant' | 'Restaurante'
 */
export function translateToken(
  namespace:
    | 'category_place'
    | 'category_event'
    | 'weather'
    | 'price'
    | 'duration'
    | 'effort'
    | 'meal'
    | 'equipment',
  token: string | null | undefined,
): string {
  if (!token) return '';
  const key = `${namespace}.${token}`;
  const translated = i18n.t(key, { defaultValue: token });
  return typeof translated === 'string' ? translated : token;
}
