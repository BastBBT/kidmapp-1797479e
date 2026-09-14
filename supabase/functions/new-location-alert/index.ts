import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { haversineKm } from '../_shared/digest/haversine.ts'
import { ageInMonths, ageMatches } from '../_shared/digest/matching.ts'
import { locationCategoryEmoji } from '../_shared/digest/locationStyle.ts'
import { notifiedIdsByUser, withoutAlreadyNotified, type PreviousSendRow } from '../_shared/digest/dedupe.ts'
import { parseServiceAccount, sendPush, type ServiceAccount } from '../_shared/push/fcm.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Absent = push désactivé pour ce run (le mail continue de partir normalement) —
// jamais une raison de faire échouer toute l'alerte.
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
const LANDING_BASE_URL = 'https://kidmapp.app/nouveaux-lieux'
// Même durée que le digest sorties (D9 du chantier profil famille) — le
// jeton reste valable le temps que le parent ouvre son mail en retard.
const TOKEN_TTL_DAYS = 30
// Fenêtre de lookback volontairement plus large qu'un jour : filet de
// sécurité si un run du cron a été manqué la veille, même raisonnement que
// releaseClaim côté weekly-digest. L'unique (user_id, send_date) empêche de
// toute façon un doublon le même jour — mais PAS d'un jour sur l'autre, d'où
// le dédoublonnage explicite ci-dessous (`DEDUPE_DAYS`).
const LOOKBACK_HOURS = 48
// Fenêtre de relecture des envois passés : juste assez pour couvrir tout le
// lookback, plus un jour de marge. Dérivée plutôt que posée en dur — elle
// suivra si le lookback change, sans repasser derrière. Inutile de remonter
// plus loin : un lieu n'est de toute façon plus éligible passé le lookback.
const DEDUPE_DAYS = Math.ceil(LOOKBACK_HOURS / 24) + 1

interface ProfileRow {
  id: string
  zone_lat: number | null
  zone_lng: number | null
  zone_radius_km: number | null
  digest_email_enabled: boolean
  digest_push_enabled: boolean
}

interface DeviceRow {
  user_id: string
  fcm_token: string
}

interface ChildRow {
  user_id: string
  first_name: string | null
  birth_month: number
  birth_year: number
}

interface LocationRow {
  id: string
  name: string
  category: string
  address: string | null
  lat: number
  lng: number
  age_min_months: number | null
  age_max_months: number | null
  status: string
  published_at: string | null
}

async function releaseClaim(supabase: ReturnType<typeof createClient>, id: string): Promise<void> {
  const { error } = await supabase.from('location_alert_sends').delete().eq('id', id)
  if (error) console.error('new-location-alert: releaseClaim failed', id, error)
}

function todayISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function runAlert() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()
  const sendDate = todayISODate(now)
  const since = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()

  // (a) Lieux nouvellement publiés dans la fenêtre de lookback.
  const { data: locations, error: locationsError } = await supabase
    .from('locations')
    .select('id, name, category, address, lat, lng, age_min_months, age_max_months, status, published_at')
    .eq('status', 'published')
    .gte('published_at', since)
    .returns<LocationRow[]>()

  if (locationsError) {
    console.error('new-location-alert: locations fetch failed', locationsError)
    return
  }
  if (!locations || locations.length === 0) {
    console.log('new-location-alert: aucun lieu récemment publié', { sendDate, since })
    return
  }

  // (b) Candidats : au moins un canal actif (email ou push), zone renseignée
  // — pas de digest_day ici, contrairement au digest sorties : un nouveau
  // lieu n'est pas un rendez-vous daté, rien à aligner sur un jour choisi.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, zone_lat, zone_lng, zone_radius_km, digest_email_enabled, digest_push_enabled')
    .or('digest_email_enabled.eq.true,digest_push_enabled.eq.true')
    .not('zone_lat', 'is', null)
    .not('zone_lng', 'is', null)
    .returns<ProfileRow[]>()

  if (profilesError) {
    console.error('new-location-alert: profiles fetch failed', profilesError)
    return
  }
  if (!profiles || profiles.length === 0) {
    console.log('new-location-alert: aucun profil à traiter', { sendDate })
    return
  }

  const profileIds = profiles.map((p) => p.id)
  const { data: childrenRows, error: childrenError } = await supabase
    .from('children')
    .select('user_id, first_name, birth_month, birth_year')
    .in('user_id', profileIds)
    .returns<ChildRow[]>()

  if (childrenError) {
    console.error('new-location-alert: children fetch failed', childrenError)
    return
  }

  const childrenByUser = new Map<string, ChildRow[]>()
  for (const c of childrenRows ?? []) {
    const list = childrenByUser.get(c.user_id) ?? []
    list.push(c)
    childrenByUser.set(c.user_id, list)
  }

  const candidates = profiles.filter((p) => (childrenByUser.get(p.id)?.length ?? 0) > 0)
  if (candidates.length === 0) {
    console.log('new-location-alert: aucun candidat avec enfant enregistré', { sendDate })
    return
  }

  // (c) Ce que ces parents ont déjà reçu ces derniers jours : sans ça, le
  // chevauchement entre le lookback (48 h) et le cron (24 h) renvoie le même
  // lieu deux jours de suite. Cf. `_shared/digest/dedupe.ts`.
  const dedupeSince = todayISODate(new Date(now.getTime() - DEDUPE_DAYS * 24 * 60 * 60 * 1000))
  const { data: previousSends, error: previousError } = await supabase
    .from('location_alert_sends')
    .select('user_id, location_ids')
    .in('user_id', candidates.map((p) => p.id))
    .gte('send_date', dedupeSince)
    .returns<PreviousSendRow[]>()

  if (previousError) {
    // On préfère ne rien envoyer plutôt que risquer le doublon qu'on vient de
    // corriger : le lookback de 48 h rattrapera ce run au prochain passage.
    // Mais la fonction répond `{ok:true}` avant de travailler (waitUntil), donc
    // pg_cron ne verra jamais cet échec : si on se contentait d'un log, un
    // incident durable rendrait l'alerte muette sans que personne le voie.
    console.error('new-location-alert: envois précédents illisibles, run annulé', previousError)
    // Statut distinct de `failed` (réservé aux échecs par destinataire, plus
    // bas) : sans ça, un `count(*) … where status = 'failed'` ne distingue plus
    // « le run entier a été abandonné » de « un parent n'a pas été servi ».
    const { error: logError } = await supabase.from('email_send_log').insert({
      template_name: 'new-location-alert',
      recipient_email: '',
      status: 'run_aborted',
      error_message: `relecture des envois précédents impossible: ${previousError.message}`.slice(0, 1000),
    })
    if (logError) console.error('email_send_log insert failed (run annulé)', logError)
    return
  }
  const notifiedByUser = notifiedIdsByUser(previousSends ?? [])

  // (d) Tokens push des candidats concernés — une seule requête batchée,
  // jamais une lecture par utilisateur dans la boucle plus bas.
  let serviceAccount: ServiceAccount | null = null
  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = parseServiceAccount(FIREBASE_SERVICE_ACCOUNT_JSON)
    } catch (e) {
      console.error('new-location-alert: FIREBASE_SERVICE_ACCOUNT_JSON invalide, push désactivé pour ce run', e)
    }
  }

  const pushCandidateIds = candidates.filter((p) => p.digest_push_enabled).map((p) => p.id)
  const devicesByUser = new Map<string, DeviceRow[]>()
  if (serviceAccount && pushCandidateIds.length > 0) {
    const { data: deviceRows, error: devicesError } = await supabase
      .from('user_devices')
      .select('user_id, fcm_token')
      .in('user_id', pushCandidateIds)
      .returns<DeviceRow[]>()
    if (devicesError) {
      console.error('new-location-alert: user_devices fetch failed', devicesError)
    } else {
      for (const d of deviceRows ?? []) {
        const list = devicesByUser.get(d.user_id) ?? []
        list.push(d)
        devicesByUser.set(d.user_id, list)
      }
    }
  }

  let sentCount = 0
  let skippedCount = 0
  let alreadyNotifiedCount = 0
  let alreadySentTodayCount = 0
  let failedCount = 0
  let pushSentCount = 0
  let pushFailedCount = 0

  for (const profile of candidates) {
    const children = childrenByUser.get(profile.id)!
    const ages = children.map((c) => ageInMonths(c.birth_month, c.birth_year, now))

    const relevant = locations.filter((loc) => {
      const ageOk = ages.some((age) => ageMatches(age, loc.age_min_months, loc.age_max_months))
      if (!ageOk) return false
      const distance = haversineKm(profile.zone_lat!, profile.zone_lng!, loc.lat, loc.lng)
      return distance <= (profile.zone_radius_km ?? 12)
    })
    const matched = withoutAlreadyNotified(relevant, notifiedByUser.get(profile.id))

    if (matched.length === 0) {
      // Deux silences bien distincts, à ne pas confondre en lisant les logs :
      // rien qui corresponde à l'âge et à la zone, ou tout ce qui correspond a
      // déjà été annoncé les jours précédents.
      if (relevant.length > 0) alreadyNotifiedCount++
      else skippedCount++
      continue
    }

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const tokenExpiresAt = new Date(now)
    tokenExpiresAt.setUTCDate(tokenExpiresAt.getUTCDate() + TOKEN_TTL_DAYS)

    // Idempotence : un seul mail par parent et par jour, contrainte unique
    // (user_id, send_date) — même patron que digest_sends. Si des lieux
    // supplémentaires sont publiés le même jour après un premier run, ils
    // rejoindront l'envoi du lendemain plutôt qu'un second mail le jour même.
    //
    // La réservation part avec `location_ids` VIDE, rempli seulement une fois
    // l'envoi passé (plus bas). Depuis que le dédoublonnage lit cette colonne,
    // y écrire avant l'envoi ferait croire au run du lendemain que le parent a
    // vu des lieux qu'il n'a jamais reçus — worker interrompu entre les deux,
    // ou `releaseClaim` qui échoue. Le doublon corrigé par cette fonction
    // réparait ce cas tout seul le lendemain ; sans cette précaution, il
    // deviendrait une perte définitive et silencieuse.
    const { data: claimed, error: claimError } = await supabase
      .from('location_alert_sends')
      .upsert(
        {
          user_id: profile.id,
          send_date: sendDate,
          location_ids: [],
          token,
          token_expires_at: tokenExpiresAt.toISOString(),
        },
        { onConflict: 'user_id,send_date', ignoreDuplicates: true },
      )
      .select('id, token')

    if (claimError) {
      console.error('new-location-alert: location_alert_sends upsert failed', profile.id, claimError)
      failedCount++
      continue
    }
    if (!claimed || claimed.length === 0) {
      // Déjà traité aujourd'hui (course perdue ou re-run du cron). Compté, pour
      // que la somme des compteurs du log de fin retombe sur `candidats`.
      alreadySentTodayCount++
      continue
    }

    const childrenNames = children.map((c) => c.first_name).filter((n): n is string => !!n && n.trim().length > 0)
    const landingUrl = `${LANDING_BASE_URL}/${token}`
    const items = matched.map((loc) => ({
      emoji: locationCategoryEmoji(loc.category),
      name: loc.name,
      address: loc.address,
      url: `https://kidmapp.app/location/${loc.id}`,
    }))

    // Les deux canaux sont indépendants : un seul suffit à considérer ces
    // lieux comme announcés (donc à ne plus les répéter demain via
    // `withoutAlreadyNotified`), et à garder la réservation du jour.
    let anySucceeded = false

    if (profile.digest_email_enabled) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id)
      const email = userData?.user?.email
      if (userError || !email) {
        console.error('new-location-alert: email introuvable', profile.id, userError)
        failedCount++
      } else {
        const idempotencyKey = `new-location-alert-${sendDate}-${profile.id}`
        try {
          const result = await sendTemplateEmail('new-location-alert', email, {
            templateData: { childrenNames, items, landingUrl },
            idempotencyKey,
          })
          const { error: logError } = await supabase.from('email_send_log').insert({
            template_name: 'new-location-alert',
            recipient_email: email,
            status: result.sent ? 'sent' : 'suppressed',
          })
          if (logError) console.error('email_send_log insert failed', logError)
          sentCount++
          anySucceeded = true
        } catch (sendError) {
          const message = sendError instanceof Error ? sendError.message : String(sendError)
          console.error('new-location-alert send error', profile.id, message)
          const { error: logError } = await supabase.from('email_send_log').insert({
            template_name: 'new-location-alert',
            recipient_email: email,
            status: 'failed',
            error_message: message.slice(0, 1000),
          })
          if (logError) console.error('email_send_log insert failed', logError)
          failedCount++
        }
      }
    }

    // `sendPush` ne lève jamais (cf. fcm.ts), mais ce bloc reste dans son
    // propre try/catch par prudence : une exception ici ne doit JAMAIS faire
    // sauter le reste de la boucle des candidats ni la mise à jour de
    // `location_ids` plus bas — la push est un bonus, jamais le chemin
    // critique de l'email.
    if (profile.digest_push_enabled && serviceAccount) {
      try {
        const devices = devicesByUser.get(profile.id) ?? []
        const pushBody =
          items.length === 1
            ? `${items[0].name} vient d'ouvrir près de chez toi.`
            : `${items.length} nouveaux lieux près de chez toi.`
        for (const device of devices) {
          const result = await sendPush(serviceAccount, {
            token: device.fcm_token,
            title: 'Nouveau lieu près de chez toi',
            body: pushBody,
            data: { url: landingUrl },
          })
          if (result.ok) {
            pushSentCount++
            anySucceeded = true
          } else {
            pushFailedCount++
            if (result.tokenInvalid) {
              const { error: deleteError } = await supabase
                .from('user_devices')
                .delete()
                .eq('user_id', profile.id)
                .eq('fcm_token', device.fcm_token)
              if (deleteError) console.error('new-location-alert: nettoyage token invalide échoué', deleteError)
            } else if (result.authFailed) {
              // Clé révoquée/mal configurée : inutile de retenter la même
              // erreur pour chaque destinataire restant du run.
              console.error('new-location-alert: authentification FCM en échec, push désactivée pour le reste du run', result.error)
              serviceAccount = null
              break
            } else {
              console.error('new-location-alert: envoi push échoué', profile.id, result.error)
            }
          }
        }
      } catch (pushError) {
        console.error('new-location-alert: envoi push a levé une exception inattendue', profile.id, pushError)
        pushFailedCount++
      }
    }

    if (anySucceeded) {
      // Au moins un canal est allé au bout : ces lieux ne doivent plus
      // repartir demain. C'est aussi ce qui alimente la page d'atterrissage
      // (uniquement pertinente pour l'email, mais sans effet de bord si le
      // parent n'a que le push actif).
      const { error: idsError } = await supabase
        .from('location_alert_sends')
        .update({ location_ids: matched.map((l) => l.id) })
        .eq('id', claimed[0].id)
      if (idsError) {
        // Pire cas : le parent reverra ces lieux demain — le défaut d'origine,
        // borné à un jour, jamais une perte.
        console.error('new-location-alert: lieux envoyés non enregistrés', profile.id, idsError)
      }
    } else {
      await releaseClaim(supabase, claimed[0].id)
    }
  }

  console.log('new-location-alert terminé', {
    sendDate,
    candidats: candidates.length,
    sentCount,
    skippedCount,
    alreadyNotifiedCount,
    alreadySentTodayCount,
    failedCount,
    pushSentCount,
    pushFailedCount,
  })
}

// EdgeRuntime est fourni par le runtime Supabase — ce shim déclare juste sa forme.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

function parseJwtRole(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = JSON.parse(atob(padded))
    return typeof json?.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (parseJwtRole(auth) !== 'service_role') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    EdgeRuntime.waitUntil(
      runAlert().catch((e) => console.error('new-location-alert background error', e)),
    )

    return new Response(JSON.stringify({ ok: true, scheduled: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('new-location-alert error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
