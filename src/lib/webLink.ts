/**
 * Lien web venant de la base (site d'un lieu ou d'une sortie, réservation, reel) : un texte libre
 * saisi par un contributeur ou importé, jamais une valeur de confiance. Seuls `http` et `https`
 * sont ouverts — ni `tel:`, `sms:`, `javascript:` ni schéma personnalisé — et un lien portant des
 * identifiants (`https://site-connu@autre-site`) est refusé : l'hôte réellement ouvert n'est pas
 * celui qu'on croit lire.
 *
 * Sans schéma, on ne complète en `https://` que ce qui ressemble à un nom de domaine : au moins
 * deux étiquettes, la dernière purement alphabétique (≥ 2 lettres), un éventuel port, et pas
 * d'espace. Une adresse e-mail, un numéro (`02.40.63.30.40`), une heure (`10.30`), un prix
 * (`12.50€`) ou une phrase (« sans réservation ») ne font pas un lien : le bouton correspondant
 * reste masqué plutôt que de pointer vers une page du site (un `href` sans schéma est relatif).
 * `@` et `:` ne comptent que dans la partie hôte : le chemin, la requête et le fragment peuvent
 * en contenir (`tiktok.com/@compte`, `?h=12:30`).
 *
 * Renvoie l'URL normalisée (`href`), celle qu'il faut à la fois ouvrir et journaliser : ce qui est
 * validé est exactement ce qui est ouvert. Miroir de `webLink()` côté Android et de
 * `URL.webLink(from:)` côté iOS : toute évolution se fait sur les trois plateformes.
 */
export function webLink(raw: string | null | undefined): string | null {
  let text = (raw ?? '').trim();
  if (!text) return null;
  if (!text.includes('://')) {
    if (!looksLikeDomain(text)) return null;
    text = `https://${text}`;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  if (url.username || url.password) return null;
  return url.href;
}

const LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const TLD = /^\p{L}{2,}$/u;

function looksLikeDomain(text: string): boolean {
  if (/\s/u.test(text)) return false;
  const end = text.search(/[/?#]/);
  const authority = end === -1 ? text : text.slice(0, end);
  if (authority.includes('@')) return false;
  let host = authority;
  const colon = authority.lastIndexOf(':');
  if (colon !== -1) {
    if (!/^\d{1,5}$/.test(authority.slice(colon + 1))) return false;
    host = authority.slice(0, colon);
  }
  const labels = host.split('.');
  return labels.length >= 2 && labels.every((l) => LABEL.test(l)) && TLD.test(labels[labels.length - 1]);
}
