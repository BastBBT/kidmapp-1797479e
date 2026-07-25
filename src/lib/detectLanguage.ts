import { franc } from 'franc-min';

// ISO 639-3 → ISO 639-1 (2-letter) codes for languages we care about.
const ISO3_TO_ISO2: Record<string, string> = {
  fra: 'fr',
  eng: 'en',
  spa: 'es',
  por: 'pt',
  ita: 'it',
  deu: 'de',
  nld: 'nl',
  cat: 'ca',
};

/**
 * Détecte la langue d'un texte libre. Retourne un code ISO 639-1 (2 lettres)
 * ou `null` si la détection n'est pas fiable. Non bloquant.
 */
export function detectLanguage(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length < 12) return null; // trop court pour être fiable

  try {
    const iso3 = franc(trimmed, { minLength: 10 });
    if (!iso3 || iso3 === 'und') return null;
    return ISO3_TO_ISO2[iso3] ?? iso3.slice(0, 2);
  } catch {
    return null;
  }
}
