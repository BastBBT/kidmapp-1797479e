/**
 * Doublons de lieux à la proposition : compare ce que l'utilisateur est en train de saisir aux lieux
 * déjà publiés, pour l'alerte « ce lieu existe peut-être déjà » et le badge « Doublon possible » de
 * l'admin. Miroir de `DuplicateLocationMatcher` (iOS, Models.swift) et de `duplicate_location.dart`
 * (Android), vérifiés contre le même tableau de cas (`src/test/fixtures/duplicateLocationCases.json`) :
 * toute évolution de la règle se fait sur les trois plateformes, avec les cas qui vont avec.
 */

/** Un lieu publié, réduit à ce qu'il faut pour le comparer et l'afficher dans l'alerte. */
export interface DuplicateCandidate {
  id: string;
  name: string;
  address: string | null;
  photo: string | null;
}

/** `strong` : nom proche ET même adresse. `weak` : nom proche seulement, ou adresse seule. */
export type DuplicateLevel = 'strong' | 'weak';

export interface DuplicateMatch {
  candidate: DuplicateCandidate;
  level: DuplicateLevel;
  /** Même adresse que le lieu proposé : décide du libellé du rappel faible (adresse ou nom proche). */
  sameAddress: boolean;
}

/** Nombre maximal de lieux affichés dans l'alerte. */
export const DUPLICATE_MAX_RESULTS = 2;

const STOPWORDS = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'de', 'du', 'des', 'd', 'et', 'au', 'aux', 'a', 'en', 'chez', 'sur', 'sous',
]);
/** Mots qui n'identifient pas un lieu : ôtés des NOMS seulement. */
const NAME_NOISE = new Set(['nantes', 'restaurant', 'resto', 'cafe', 'bar']);
/** Mots de voirie ou de centre commercial : ôtés des ADRESSES seulement. */
const STREET_NOISE = new Set([
  'rue', 'avenue', 'av', 'boulevard', 'bd', 'bld', 'chemin', 'ch', 'place', 'pl', 'allee', 'impasse', 'route',
  'rte', 'quai', 'cours', 'passage', 'square', 'zone', 'za', 'zi', 'centre', 'commercial', 'cc', 'cial', 'ctre',
]);
const FOLD_PAIRS: [string, string][] = [
  ['àáâãäå', 'a'], ['ç', 'c'], ['èéêë', 'e'], ['ìíîï', 'i'], ['ñ', 'n'], ['òóôõö', 'o'],
  ['ùúûü', 'u'], ['ýÿ', 'y'], ['œ', 'oe'], ['æ', 'ae'], ['ß', 'ss'],
];
const FOLD_MAP = new Map<number, string>();
for (const [chars, ascii] of FOLD_PAIRS) for (const ch of chars) FOLD_MAP.set(ch.codePointAt(0)!, ascii);

/**
 * Minuscules ASCII : accents repliés, marques combinantes ignorées, tout le reste devient une
 * espace (apostrophes droites ou typographiques, tirets, virgules…). Même règle, code point par
 * code point, sur les trois plateformes.
 */
export function duplicateFold(raw: string): string {
  let out = '';
  for (const ch of raw.toLowerCase()) {
    const v = ch.codePointAt(0)!;
    if (v >= 0x300 && v <= 0x36f) continue;
    const m = FOLD_MAP.get(v);
    if (m !== undefined) out += m;
    else if ((v >= 0x61 && v <= 0x7a) || (v >= 0x30 && v <= 0x39)) out += ch;
    else out += ' ';
  }
  return out;
}

const tokens = (raw: string): string[] => duplicateFold(raw).split(' ').filter((t) => t.length > 0);
const nameTokens = (raw: string): string[] => tokens(raw).filter((t) => !STOPWORDS.has(t) && !NAME_NOISE.has(t));
const isNumber = (t: string): boolean => /^[0-9]+$/.test(t);

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Ressemblance de deux noms, de 0 à 1 : le meilleur de la distance d'édition sur les mots collés
 * (« P'tit Zinc » = « Ptit Zinc ») et de l'inclusion de mots (« You Kids Atlantis » dans « You Kids
 * Nantes Atlantis »). Un seul mot partagé ne compte que s'il est long : « parc » seul ne dit rien.
 */
export function duplicateNameScore(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  const ca = ta.join('');
  const cb = tb.join('');
  if (ca.length === 0 || cb.length === 0) return 0;
  const edit = 1 - levenshtein(ca, cb) / Math.max(ca.length, cb.length);
  const sa = new Set(ta);
  const sb = new Set(tb);
  const shared = [...sa].filter((t) => sb.has(t));
  const m = Math.min(sa.size, sb.size);
  let containment = 0;
  if (shared.length >= 2 || (m === 1 && shared.length === 1 && shared[0].length >= 5)) {
    containment = shared.length / m;
  }
  return Math.max(edit, containment);
}

/** Partie « rue » d'une adresse : avant la dernière virgule s'il y en a une, puis avant le code postal. */
function streetTokens(raw: string): string[] {
  let text = raw;
  const comma = text.lastIndexOf(',');
  if (comma >= 0) text = text.slice(0, comma);
  let toks = tokens(text);
  const i = toks.findIndex((t) => t.length === 5 && isNumber(t));
  if (i > 0) toks = toks.slice(0, i);
  return toks.filter((t) => !STOPWORDS.has(t) && !STREET_NOISE.has(t));
}

const streetNumber = (raw: string | null | undefined): string | undefined =>
  raw == null ? undefined : streetTokens(raw).find(isNumber);

/**
 * Même adresse : numéros compatibles (s'ils sont tous deux présents) et au moins un mot de rue
 * de 4 lettres ou plus en commun, couvrant 60 % du plus court des deux.
 */
export function duplicateSameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return false;
  const ta = streetTokens(a);
  const tb = streetTokens(b);
  const numA = ta.find(isNumber);
  const numB = tb.find(isNumber);
  if (numA !== undefined && numB !== undefined && numA !== numB) return false;
  const wa = new Set(ta.filter((t) => !isNumber(t)));
  const wb = new Set(tb.filter((t) => !isNumber(t)));
  if (wa.size === 0 || wb.size === 0) return false;
  const shared = [...wa].filter((t) => wb.has(t));
  if (!shared.some((t) => t.length >= 4)) return false;
  return shared.length / Math.min(wa.size, wb.size) >= 0.6;
}

/**
 * Lieux publiés qui ressemblent à ce que l'utilisateur est en train de proposer : au plus
 * `DUPLICATE_MAX_RESULTS`, tous du même niveau (s'il y en a de forts, les faibles sont tus).
 */
export function findDuplicateLocations(name: string, address: string, candidates: DuplicateCandidate[]): DuplicateMatch[] {
  if (nameTokens(name).join('').length < 3) return [];
  const strong: [DuplicateMatch, number][] = [];
  const weak: [DuplicateMatch, number][] = [];
  for (const c of candidates) {
    const score = duplicateNameScore(name, c.name);
    const sameAddr = duplicateSameAddress(address, c.address);
    // Une adresse seule ne vaut un rappel que si les deux portent un numéro : « Centre Atlantis »
    // ou « Route de Saint-Joseph » désignent bien des lieux voisins, pas le même.
    const numbered = streetNumber(address) !== undefined && streetNumber(c.address) !== undefined;
    if (sameAddr && score >= 0.5) {
      strong.push([{ candidate: c, level: 'strong', sameAddress: true }, score + 1]);
    } else if (sameAddr && numbered) {
      weak.push([{ candidate: c, level: 'weak', sameAddress: true }, score + 1]);
    } else if (!sameAddr && score >= 0.8) {
      weak.push([{ candidate: c, level: 'weak', sameAddress: false }, score]);
    }
  }
  const pool = strong.length === 0 ? weak : strong;
  return pool
    .sort((x, y) => (x[1] !== y[1] ? y[1] - x[1] : x[0].candidate.id < y[0].candidate.id ? -1 : x[0].candidate.id > y[0].candidate.id ? 1 : 0))
    .slice(0, DUPLICATE_MAX_RESULTS)
    .map(([m]) => m);
}
