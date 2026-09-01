import type { TFunction } from 'i18next';

/**
 * Classement d'un échec d'écriture Supabase (proposer un lieu, un événement,
 * contribuer).
 *
 * Historique : le 2026-08-31 les colonnes `age_min`/`age_max` ont été renommées
 * en `age_min_months`/`age_max_months`. Les apps mobiles déjà distribuées ont
 * continué à poster l'ancien nom, PostgREST a répondu `PGRST204`, et le message
 * générique « vérifie ta connexion » a envoyé un testeur chercher une panne
 * réseau inexistante pendant que toutes les soumissions mouraient. D'où deux
 * règles, appliquées sur les trois plateformes : un message par famille de
 * cause, et le code technique affiché avec, pour qu'une capture d'écran suffise
 * à diagnostiquer.
 *
 * Portée : ces écritures sont toutes des insertions « à son propre nom »
 * (`WITH CHECK (auth.uid() = user_id)`), donc un `42501` y signifie bien une
 * session absente ou expirée. Sur une écriture réservée aux admins
 * (`events_insert_admin`), le même code voudrait dire « tu n'es pas admin » et
 * ce mapping-là serait faux : ne pas réutiliser tel quel.
 */
export type SubmitFailureKind =
  | 'app_outdated'
  | 'session_expired'
  | 'invalid_field'
  | 'photo_upload'
  | 'network'
  | 'unknown';

/** Le schéma attendu par ce bundle n'existe plus côté base. */
const SCHEMA_MISMATCH = ['PGRST204', 'PGRST202', '42703', '42P01', '42883'];
/** RLS ou JWT : la session ne permet plus l'écriture. */
const NOT_AUTHORIZED = ['PGRST301', '42501'];
/** Contrainte de validation : CHECK, NOT NULL, unicité, type, longueur. */
const INVALID_FIELD = ['23514', '23502', '23505', '22001', '22007', '22P02'];

/**
 * Messages d'échec de transport. `postgrest-js` **n'émet pas** de `TypeError`
 * quand `fetch` échoue : il transforme l'erreur en objet simple
 * `{ message: 'TypeError: Failed to fetch', details, hint, code: '' }`
 * (`PostgrestBuilder.then`, branche `res.catch`). Reconnaître la famille au
 * message est donc le seul moyen de ne pas classer une vraie coupure en
 * « erreur inconnue ». « Load failed » est la formulation de Safari.
 */
const NETWORK_MESSAGE =
  /failed to fetch|load failed|networkerror|network request failed|fetcherror|aborterror|err_network|dns/i;

function field(err: unknown, name: string): string {
  if (typeof err !== 'object' || err === null || !(name in err)) return '';
  const value = (err as Record<string, unknown>)[name];
  return value === null || value === undefined ? '' : String(value);
}

/**
 * `storage-js` n'a pas de champ `code` mais un `statusCode` (chaîne) et un
 * `status` (nombre) : sans ce repli, une photo refusée par le bucket (trop
 * lourde, type interdit) arrivait à l'écran sans aucun indice.
 */
function storageStatus(err: unknown): string {
  if (field(err, 'code')) return '';
  return field(err, 'statusCode') || field(err, 'status');
}

/** Seule famille qui mérite « vérifie ta connexion ». */
function isNetworkFailure(err: unknown, code: string): boolean {
  // Un code veut dire que la requête est arrivée jusqu'au serveur.
  if (code) return false;
  if (err instanceof TypeError) return true;
  if (NETWORK_MESSAGE.test(field(err, 'message'))) return true;
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function classifySubmitFailure(err: unknown): {
  kind: SubmitFailureKind;
  code?: string;
} {
  const code = field(err, 'code');

  if (SCHEMA_MISMATCH.includes(code)) return { kind: 'app_outdated', code };
  if (NOT_AUTHORIZED.includes(code)) return { kind: 'session_expired', code };
  if (INVALID_FIELD.includes(code)) return { kind: 'invalid_field', code };

  // Échec de l'envoi de la photo : le formulaire reste ouvert avec la saisie,
  // l'utilisateur peut réessayer ou la retirer. Même comportement sur iOS et
  // Android.
  const status = storageStatus(err);
  if (status) return { kind: 'photo_upload', code: status };

  if (isNetworkFailure(err, code)) return { kind: 'network' };

  return code ? { kind: 'unknown', code } : { kind: 'unknown' };
}

/**
 * Message à afficher. `fallback` est le message propre au formulaire, utilisé
 * seulement quand la cause reste inconnue.
 */
export function submitFailureText(
  err: unknown,
  t: TFunction,
  fallback: string,
): string {
  const { kind, code } = classifySubmitFailure(err);
  const message = kind === 'unknown' ? fallback : t(`submit_error.${kind}`);
  return code ? `${message} (${code})` : message;
}
