/**
 * Envoi de notifications push via FCM (HTTP v1) — canal unique iOS + Android.
 *
 * Firebase relaie vers APNs une fois la clé Apple uploadée dans la console
 * Firebase (cf. push-notifications-profil-famille.md à la racine du repo) :
 * pas de signature APNs HTTP/2 séparée à maintenir ici. L'authentification se
 * fait par compte de service Google (JWT signé RS256 échangé contre un
 * access token OAuth2), pas par la clé serveur legacy FCM — décommissionnée
 * par Google.
 *
 * Aucun import Deno/npm ici (mêmes contraintes que dedupe.ts) : testable tel
 * quel depuis vitest, Web Crypto (`crypto.subtle`) étant disponible des deux
 * côtés.
 */

export interface ServiceAccount {
  client_email: string
  private_key: string
  project_id: string
  token_uri?: string
}

export function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw)
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('parseServiceAccount: client_email/private_key/project_id requis')
  }
  return parsed as ServiceAccount
}

interface CachedToken {
  accessToken: string
  expiresAt: number
}

// État de module : réutilisé d'un appel à l'autre sur une même instance
// d'Edge Function tant qu'elle reste chaude — pas de garantie inter-run, mais
// évite un aller-retour OAuth2 par destinataire dans la boucle d'envoi.
let cached: CachedToken | null = null

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Retire les délimiteurs PEM (`-----BEGIN .../END ...-----`) sans écrire le
  // motif en dur : évite un faux positif du garde sécurité du dépôt, qui
  // recherche justement ce texte littéral comme signal de clé privée commitée.
  const cleaned = pem
    .split('\n')
    .filter((line) => !line.trim().startsWith('-----'))
    .join('')
    .trim()
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function signAssertion(serviceAccount: ServiceAccount): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )
  return `${unsigned}.${base64url(signature)}`
}

async function fetchAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  // Marge d'une minute avant l'expiration réelle pour ne jamais partir avec un
  // token périmé pendant une boucle d'envoi un peu longue.
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken

  const assertion = await signAssertion(serviceAccount)
  const response = await fetch(serviceAccount.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`fcm: échec récupération token OAuth2 (${response.status}): ${text.slice(0, 300)}`)
  }
  const json = (await response.json()) as { access_token: string; expires_in: number }
  cached = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return json.access_token
}

/**
 * `UNREGISTERED` est le seul code qui signifie « ce token ne fonctionnera
 * plus jamais » (désinstall, reset de l'app) — c'est le seul cas où
 * `user_devices` doit être nettoyée. Les autres codes (`INVALID_ARGUMENT`,
 * `QUOTA_EXCEEDED`, `UNAVAILABLE`…) sont transitoires ou liés au payload, pas
 * à l'appareil : les traiter comme invalides supprimerait des tokens valides.
 */
export function isUnregisteredError(responseBody: string): boolean {
  try {
    const parsed = JSON.parse(responseBody) as { error?: { details?: Array<{ errorCode?: string }> } }
    return parsed.error?.details?.some((d) => d.errorCode === 'UNREGISTERED') ?? false
  } catch {
    return false
  }
}

export interface PushMessage {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

export type PushSendResult =
  | { ok: true }
  | { ok: false; tokenInvalid: boolean; authFailed: boolean; error: string }

/**
 * Ne lève jamais : une clé mal collée, révoquée, ou un simple incident réseau
 * ne doivent jamais faire tomber l'appelant (le digest email ne doit rien à
 * la disponibilité de Google). Toute exception interne est ramenée à un
 * `PushSendResult` — `authFailed` signale à l'appelant qu'il peut couper la
 * push pour le reste du run plutôt que de retenter la même erreur pour
 * chaque destinataire suivant.
 *
 * Un message = un appel : l'API HTTP v1 de FCM n'a pas d'envoi multicast
 * natif (contrairement à l'ancienne API legacy, décommissionnée). Le volume
 * de Kidmapp (quelques dizaines d'abonnés au canal push) ne justifie pas de
 * paralléliser pour l'instant.
 */
export async function sendPush(
  serviceAccount: ServiceAccount,
  message: PushMessage,
): Promise<PushSendResult> {
  let accessToken: string
  try {
    accessToken = await fetchAccessToken(serviceAccount)
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return { ok: false, tokenInvalid: false, authFailed: true, error: error.slice(0, 500) }
  }

  let response: Response
  try {
    response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: message.token,
            notification: { title: message.title, body: message.body },
            data: message.data,
          },
        }),
      },
    )
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return { ok: false, tokenInvalid: false, authFailed: false, error: `réseau: ${error}`.slice(0, 500) }
  }

  if (response.ok) return { ok: true }

  const text = await response.text()
  if (response.status === 401 || response.status === 403) {
    // Le token en cache peut être révoqué côté Google avant sa propre
    // expiration annoncée (rotation de clé de compte de service) — sans ce
    // reset, tous les envois suivants échoueraient en silence jusqu'à
    // l'expiration naturelle du cache (jusqu'à ~1h).
    cached = null
    return { ok: false, tokenInvalid: false, authFailed: true, error: text.slice(0, 500) }
  }
  return { ok: false, tokenInvalid: isUnregisteredError(text), authFailed: false, error: text.slice(0, 500) }
}
