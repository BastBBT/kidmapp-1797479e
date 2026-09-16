/**
 * Câblage commun aux deux crons qui envoient des push (`weekly-digest`,
 * `new-location-alert`) : chargement du compte de service, lecture batchée
 * des devices, boucle d'envoi + nettoyage + trace. Extrait ici après audit
 * `/check-pr` sur la PR #62 — ~55 lignes identiques dans les deux fonctions,
 * un correctif futur (cf. le fix `authFailed` du même audit) aurait dû être
 * appliqué deux fois sans ça.
 *
 * Contrairement à `fcm.ts`, ce fichier importe `npm:@supabase/supabase-js` et
 * `Deno.env` — pas prévu pour être testé tel quel depuis vitest (patron déjà
 * suivi par `weekly-digest/index.ts` lui-même, qui n'est pas testé non plus).
 */
import { parseServiceAccount, sendPush, type ServiceAccount, type PushMessage } from './fcm.ts'

// Le client Supabase est intentionnellement non-typé (pas de générique
// Database) dans les edge functions. ReturnType<typeof createClient> résout
// des génériques différents selon l'overload, ce qui provoque des conflits
// de type avec l'instance réelle — on garde le type large.
type SupabaseClientType = any

export interface DeviceRow {
  user_id: string
  fcm_token: string
  platform: string
}

/** Absent ou invalide → push désactivé pour ce run, jamais une raison de
 * faire échouer le reste (l'email continue de partir normalement). */
export function loadServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
  if (!raw) return null
  try {
    return parseServiceAccount(raw)
  } catch (e) {
    console.error('push: FIREBASE_SERVICE_ACCOUNT_JSON invalide, push désactivé pour ce run', e)
    return null
  }
}

/** Une seule requête batchée pour tous les candidats push d'un run — jamais
 * une lecture par utilisateur dans la boucle d'envoi. */
export async function loadDevicesByUser(
  supabase: SupabaseClientType,
  userIds: string[],
  logPrefix: string,
): Promise<Map<string, DeviceRow[]>> {
  const devicesByUser = new Map<string, DeviceRow[]>()
  if (userIds.length === 0) return devicesByUser

  const { data, error } = await supabase
    .from('user_devices')
    .select('user_id, fcm_token, platform')
    .in('user_id', userIds)

  if (error) {
    // La push est un bonus par rapport à l'email, jamais le chemin critique :
    // un échec de lecture ne doit pas empêcher les mails de partir.
    console.error(`${logPrefix}: user_devices fetch failed`, error)
    return devicesByUser
  }
  for (const d of data ?? []) {
    const list = devicesByUser.get(d.user_id) ?? []
    list.push(d)
    devicesByUser.set(d.user_id, list)
  }
  return devicesByUser
}

export interface SendToUserResult {
  sent: number
  failed: number
  /** L'appelant doit couper `serviceAccount` pour le reste du run plutôt que
   * de retenter la même erreur d'authentification pour chaque destinataire
   * suivant. */
  authFailed: boolean
}

/**
 * Envoie le même message à tous les devices d'un utilisateur, nettoie les
 * tokens `UNREGISTERED`, et trace chaque tentative dans `email_send_log`
 * (colonne `metadata`, `channel: 'push'` — pas de nouvelle table : sans
 * cette trace, un parent servi uniquement par push restait invisible a
 * posteriori, contrairement à l'email). Ne lève jamais (cf. `sendPush`).
 */
export async function sendToUserDevices(
  supabase: SupabaseClientType,
  serviceAccount: ServiceAccount,
  userId: string,
  devices: DeviceRow[],
  message: Omit<PushMessage, 'token'>,
  templateName: string,
): Promise<SendToUserResult> {
  let sent = 0
  let failed = 0
  let authFailed = false

  try {
    for (const device of devices) {
      const result = await sendPush(serviceAccount, { ...message, token: device.fcm_token })

      const { error: logError } = await supabase.from('email_send_log').insert({
        template_name: templateName,
        recipient_email: '',
        status: result.ok ? 'sent' : 'failed',
        error_message: result.ok ? null : result.error.slice(0, 1000),
        metadata: { channel: 'push', user_id: userId, platform: device.platform },
      })
      if (logError) console.error(`${templateName}: email_send_log insert failed (push)`, logError)

      if (result.ok) {
        sent++
        continue
      }

      failed++
      if (result.tokenInvalid) {
        const { error } = await supabase
          .from('user_devices')
          .delete()
          .eq('user_id', userId)
          .eq('fcm_token', device.fcm_token)
        if (error) console.error(`${templateName}: nettoyage token invalide échoué`, error)
      } else if (result.authFailed) {
        console.error(`${templateName}: authentification FCM en échec, push désactivée pour le reste du run`, result.error)
        authFailed = true
        break
      } else {
        console.error(`${templateName}: envoi push échoué`, userId, result.error)
      }
    }
  } catch (pushError) {
    console.error(`${templateName}: envoi push a levé une exception inattendue`, userId, pushError)
    failed++
  }

  return { sent, failed, authFailed }
}
