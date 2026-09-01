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
 */
export type SubmitFailureKind =
  | 'app_outdated'
  | 'session_expired'
  | 'invalid_field'
  | 'network'
  | 'unknown';

/** Le schéma attendu par ce bundle n'existe plus côté base. */
const SCHEMA_MISMATCH = ['PGRST204', 'PGRST202', '42703', '42P01', '42883'];
/** RLS ou JWT : la session ne permet plus l'écriture. */
const NOT_AUTHORIZED = ['401', 'PGRST301', '42501'];
/** Contrainte de validation : CHECK, NOT NULL, unicité, type, longueur. */
const INVALID_FIELD = ['23514', '23502', '23505', '22001', '22007', '22P02'];

export function classifySubmitFailure(err: unknown): {
  kind: SubmitFailureKind;
  code?: string;
} {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code ?? '')
      : '';

  if (SCHEMA_MISMATCH.includes(code)) return { kind: 'app_outdated', code };
  if (NOT_AUTHORIZED.includes(code)) return { kind: 'session_expired', code };
  if (INVALID_FIELD.includes(code)) return { kind: 'invalid_field', code };

  // `fetch` rejette avec un TypeError quand la requête n'est jamais partie :
  // seul cas qui mérite « vérifie ta connexion ».
  if (!code && (err instanceof TypeError || !navigator.onLine)) {
    return { kind: 'network' };
  }

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
