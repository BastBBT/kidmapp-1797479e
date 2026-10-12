/**
 * Lien web venant de la base (site d'un lieu ou d'une sortie, réservation, reel) : un texte libre
 * saisi par un contributeur ou importé, jamais une valeur de confiance. Renvoie l'URL **canonique**
 * à ouvrir ET à journaliser, ou `null` si le texte n'est pas un lien web exploitable : le bouton
 * correspondant reste alors masqué (un `href` sans schéma serait une page du site).
 *
 * La validation est textuelle, faite avant tout parseur d'URL : les trois plateformes ont des
 * parseurs qui divergent (`URL` WHATWG, `Uri` Dart, `URL(string:)` Swift), pas les règles ci-dessous.
 * Miroir de `canonicalWebLink()` (Android) et `URL.webLinkString(from:)` (iOS), vérifiés contre le
 * même tableau de cas (`src/test/fixtures/webLinkCases.json`) : toute évolution se fait sur les
 * trois plateformes.
 *
 *  1. Bords : espaces Unicode et caractères de largeur nulle retirés.
 *  2. Refus si le texte contient, à l'intérieur, un caractère de contrôle, un espace, un caractère
 *     de largeur nulle, un contrôle bidirectionnel ou une barre inversée.
 *  3. Schéma explicite (`xxx://`) : `http` ou `https` seulement. Sans schéma : `https`, et ce qui
 *     suit doit être un nom de domaine (une adresse e-mail, un numéro, une heure, un prix ou une
 *     phrase n'en sont pas). `javascript:`, `tel:`, `mailto:`… n'ont pas de `//` : ils tombent ici
 *     et échouent sur le port.
 *  4. Autorité (jusqu'au premier `/`, `?` ou `#`) : aucun `@` (identifiants refusés, vides compris),
 *     port numérique de 1 à 5 chiffres (1-65535).
 *  5. Hôte : au moins deux étiquettes de 1 à 63 caractères (lettres, chiffres, tiret au milieu ; pas
 *     de marque combinante, donc forme composée), 253 au plus, dernière étiquette alphabétique de
 *     2 lettres ou plus (ou `xn--…`). Ni adresse IP, ni `localhost`, ni `%`. Un point final est toléré.
 *  6. Sortie : schéma et hôte en minuscules, port omis s'il est celui du schéma, chemin, requête et
 *     fragment inchangés, `/` ajouté si le chemin est vide.
 */
export function webLink(raw: string | null | undefined): string | null {
  const chars = Array.from(raw ?? '');
  let start = 0;
  let end = chars.length;
  while (start < end && isEdge(chars[start].codePointAt(0)!)) start++;
  while (end > start && isEdge(chars[end - 1].codePointAt(0)!)) end--;
  const trimmed = chars.slice(start, end);
  if (trimmed.length === 0) return null;
  if (trimmed.some((c) => isForbidden(c.codePointAt(0)!))) return null;
  const text = trimmed.join('');

  let scheme = 'https';
  let rest = text;
  const explicit = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(text);
  if (explicit) {
    scheme = explicit[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') return null;
    rest = text.slice(explicit[0].length);
  }

  const cut = rest.search(/[/?#]/);
  const authority = cut === -1 ? rest : rest.slice(0, cut);
  let remainder = cut === -1 ? '' : rest.slice(cut);
  if (authority.includes('@')) return null;

  let host = authority;
  let port: number | null = null;
  const colon = authority.lastIndexOf(':');
  if (colon !== -1) {
    const digits = authority.slice(colon + 1);
    if (!/^[0-9]{1,5}$/.test(digits)) return null;
    port = parseInt(digits, 10);
    if (port < 1 || port > 65535) return null;
    host = authority.slice(0, colon);
  }

  host = host.toLowerCase();
  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!isHostname(host)) return null;

  const defaultPort = scheme === 'https' ? 443 : 80;
  const portPart = port !== null && port !== defaultPort ? `:${port}` : '';
  if (remainder === '') remainder = '/';
  else if (remainder.startsWith('?') || remainder.startsWith('#')) remainder = `/${remainder}`;
  return `${scheme}://${host}${portPart}${remainder}`;
}

const WHITE_SPACE: [number, number][] = [
  [0x9, 0xd], [0x20, 0x20], [0x85, 0x85], [0xa0, 0xa0], [0x1680, 0x1680], [0x2000, 0x200a],
  [0x2028, 0x2029], [0x202f, 0x202f], [0x205f, 0x205f], [0x3000, 0x3000],
];
const ZERO_WIDTH = [0x200b, 0x200c, 0x200d, 0x2060, 0xfeff];
const BIDI: [number, number][] = [[0x200e, 0x200f], [0x202a, 0x202e], [0x2066, 0x2069]];

const inRanges = (cp: number, ranges: [number, number][]) => ranges.some(([a, b]) => cp >= a && cp <= b);
const isEdge = (cp: number) => inRanges(cp, WHITE_SPACE) || ZERO_WIDTH.includes(cp);
const isForbidden = (cp: number) =>
  cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f) || cp === 0x5c || isEdge(cp) || inRanges(cp, BIDI);

const isLetter = (c: string) => /^\p{L}$/u.test(c);
const isNumber = (c: string) => /^\p{N}$/u.test(c);

function isHostname(host: string): boolean {
  if (Array.from(host).length > 253) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  for (const label of labels) {
    const cs = Array.from(label);
    if (cs.length < 1 || cs.length > 63) return false;
    if (cs[0] === '-' || cs[cs.length - 1] === '-') return false;
    if (!cs.every((c) => c === '-' || isLetter(c) || isNumber(c))) return false;
  }
  const tld = Array.from(labels[labels.length - 1]);
  const alphabetic = tld.length >= 2 && tld.every(isLetter);
  const punycode = labels[labels.length - 1].startsWith('xn--') && tld.length >= 6;
  return alphabetic || punycode;
}

/**
 * Message de saisie pour un lien refusé : la fiche masquerait ce lien, autant le dire avant l'envoi.
 * `null` si le champ est vide (facultatif) ou si le lien est exploitable. Même texte que sur iOS et
 * Android (« URL invalide (ex : monsite.fr ou https://monsite.fr) »).
 */
export function webLinkInputError(value: string): string | null {
  return value.trim() === '' || webLink(value) !== null
    ? null
    : 'URL invalide (ex : monsite.fr ou https://monsite.fr)';
}
