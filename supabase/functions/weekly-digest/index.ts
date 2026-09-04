import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { haversineKm } from '../_shared/digest/haversine.ts'
import { ageInMonths, ageMatches } from '../_shared/digest/matching.ts'
import { eventCategoryEmoji } from '../_shared/digest/eventStyle.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LANDING_BASE_URL = 'https://kidmapp.app/semaine'
// Fenêtre de la sélection : 30 jours (D9 du chantier profil famille) — le
// jeton reste valable le temps que le parent ouvre son mail en retard.
const TOKEN_TTL_DAYS = 30

interface ProfileRow {
  id: string
  zone_lat: number | null
  zone_lng: number | null
  zone_radius_km: number | null
}

interface ChildRow {
  user_id: string
  first_name: string | null
  birth_month: number
  birth_year: number
}

interface OccurrenceRow {
  id: string
  event_id: string
  date_start: string
  date_end: string | null
  time: string | null
}

interface EventRow {
  id: string
  name: string
  category: string
  address: string | null
  lat: number | null
  lng: number | null
  age_min_months: number | null
  age_max_months: number | null
  status: string
}

function todayISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysISO(d: Date, days: number): string {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + days)
  return todayISODate(copy)
}

function formatDateLabel(occ: OccurrenceRow): string {
  const d = new Date(occ.date_start + 'T00:00:00Z')
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
  return occ.time ? `${label} · ${occ.time}` : label
}

async function runDigest() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()
  const dow = now.getUTCDay() // 0=dimanche..6=samedi, même convention que EXTRACT(DOW)
  const sendDate = todayISODate(now)
  const windowEnd = addDaysISO(now, 7)

  // (a) Candidats du jour : canal email actif, jour d'envoi = aujourd'hui, zone renseignée.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, zone_lat, zone_lng, zone_radius_km')
    .eq('digest_email_enabled', true)
    .eq('digest_day', dow)
    .not('zone_lat', 'is', null)
    .not('zone_lng', 'is', null)
    .returns<ProfileRow[]>()

  if (profilesError) {
    console.error('weekly-digest: profiles fetch failed', profilesError)
    return
  }
  if (!profiles || profiles.length === 0) {
    console.log('weekly-digest: aucun profil à traiter aujourd\'hui', { sendDate, dow })
    return
  }

  const profileIds = profiles.map((p) => p.id)
  const { data: childrenRows, error: childrenError } = await supabase
    .from('children')
    .select('user_id, first_name, birth_month, birth_year')
    .in('user_id', profileIds)
    .returns<ChildRow[]>()

  if (childrenError) {
    console.error('weekly-digest: children fetch failed', childrenError)
    return
  }

  const childrenByUser = new Map<string, ChildRow[]>()
  for (const c of childrenRows ?? []) {
    const list = childrenByUser.get(c.user_id) ?? []
    list.push(c)
    childrenByUser.set(c.user_id, list)
  }

  // Un profil sans enfant enregistré n'a rien à filtrer par âge — le flux
  // entier repose sur les enfants (hook → saisie), pas un cas d'erreur.
  const candidates = profiles.filter((p) => (childrenByUser.get(p.id)?.length ?? 0) > 0)
  if (candidates.length === 0) {
    console.log('weekly-digest: aucun candidat avec enfant enregistré', { sendDate })
    return
  }

  // (b) Une seule requête batchée pour toute la fenêtre J→J+7, catalogue petit
  // (~260 lieux/events publiés) — pas une requête par utilisateur.
  const { data: occurrences, error: occError } = await supabase
    .from('event_occurrences')
    .select('id, event_id, date_start, date_end, time')
    .gte('date_start', sendDate)
    .lt('date_start', windowEnd)
    .returns<OccurrenceRow[]>()

  if (occError) {
    console.error('weekly-digest: occurrences fetch failed', occError)
    return
  }
  if (!occurrences || occurrences.length === 0) {
    console.log('weekly-digest: aucune occurrence dans la fenêtre', { sendDate, windowEnd })
    return
  }

  const eventIds = Array.from(new Set(occurrences.map((o) => o.event_id)))
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, name, category, address, lat, lng, age_min_months, age_max_months, status')
    .in('id', eventIds)
    .eq('status', 'published')
    .returns<EventRow[]>()

  if (eventsError) {
    console.error('weekly-digest: events fetch failed', eventsError)
    return
  }

  const eventsById = new Map((events ?? []).map((e) => [e.id, e]))
  const validOccurrences = occurrences
    .filter((o) => eventsById.has(o.event_id))
    .sort((a, b) => (a.date_start === b.date_start ? (a.time ?? '').localeCompare(b.time ?? '') : a.date_start.localeCompare(b.date_start)))

  if (validOccurrences.length === 0) {
    console.log('weekly-digest: aucune occurrence rattachée à un event publié', { sendDate })
    return
  }

  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const profile of candidates) {
    const children = childrenByUser.get(profile.id)!
    const ages = children.map((c) => ageInMonths(c.birth_month, c.birth_year, now))

    const matched = validOccurrences.filter((occ) => {
      const ev = eventsById.get(occ.event_id)!
      const ageOk = ages.some((age) => ageMatches(age, ev.age_min_months, ev.age_max_months))
      if (!ageOk) return false
      if (ev.lat === null || ev.lng === null) return false
      const distance = haversineKm(profile.zone_lat!, profile.zone_lng!, ev.lat, ev.lng)
      return distance <= (profile.zone_radius_km ?? 12)
    })

    if (matched.length === 0) {
      // D11 — silence intentionnel, jamais de mail « rien cette semaine ».
      // On logue quand même (skipped_no_match) pour que le silence reste
      // visible côté ops sans nouvelle infra de monitoring.
      const { error: logError } = await supabase.from('email_send_log').insert({
        template_name: 'weekly-digest',
        recipient_email: '',
        status: 'skipped_no_match',
      })
      if (logError) console.error('email_send_log insert failed (skip)', logError)
      skippedCount++
      continue
    }

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const tokenExpiresAt = new Date(now)
    tokenExpiresAt.setUTCDate(tokenExpiresAt.getUTCDate() + TOKEN_TTL_DAYS)

    // Idempotence : la contrainte unique (user_id, send_date) est la vraie
    // garde anti-course, pas une lecture préalable — un run concurrent (retry
    // pg_net) qui perd la course ne renvoie aucune ligne et n'envoie rien.
    const { data: claimed, error: claimError } = await supabase
      .from('digest_sends')
      .upsert(
        {
          user_id: profile.id,
          send_date: sendDate,
          occurrence_ids: matched.map((o) => o.id),
          token,
          token_expires_at: tokenExpiresAt.toISOString(),
        },
        { onConflict: 'user_id,send_date', ignoreDuplicates: true },
      )
      .select('id, token')

    if (claimError) {
      console.error('weekly-digest: digest_sends upsert failed', profile.id, claimError)
      failedCount++
      continue
    }
    if (!claimed || claimed.length === 0) {
      // Déjà traité aujourd'hui (course perdue ou re-run du cron) — rien à renvoyer.
      continue
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id)
    const email = userData?.user?.email
    if (userError || !email) {
      console.error('weekly-digest: email introuvable', profile.id, userError)
      failedCount++
      continue
    }

    const childrenNames = children.map((c) => c.first_name).filter((n): n is string => !!n && n.trim().length > 0)
    const landingUrl = `${LANDING_BASE_URL}/${token}`
    const items = matched.map((occ) => {
      const ev = eventsById.get(occ.event_id)!
      return {
        emoji: eventCategoryEmoji(ev.category),
        name: ev.name,
        dateLabel: formatDateLabel(occ),
        address: ev.address,
      }
    })

    const idempotencyKey = `weekly-digest-${sendDate}-${profile.id}`
    try {
      const result = await sendTemplateEmail('weekly-digest', email, {
        templateData: { childrenNames, items, landingUrl },
        idempotencyKey,
      })
      const { error: logError } = await supabase.from('email_send_log').insert({
        template_name: 'weekly-digest',
        recipient_email: email,
        status: result.sent ? 'sent' : 'suppressed',
      })
      if (logError) console.error('email_send_log insert failed', logError)
      sentCount++
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError)
      console.error('weekly-digest send error', profile.id, message)
      const { error: logError } = await supabase.from('email_send_log').insert({
        template_name: 'weekly-digest',
        recipient_email: email,
        status: 'failed',
        error_message: message.slice(0, 1000),
      })
      if (logError) console.error('email_send_log insert failed', logError)
      failedCount++
    }
  }

  console.log('weekly-digest terminé', { sendDate, candidats: candidates.length, sentCount, skippedCount, failedCount })
}

// @ts-ignore EdgeRuntime is provided by Supabase runtime
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

    // @ts-ignore
    EdgeRuntime.waitUntil(
      runDigest().catch((e) => console.error('weekly-digest background error', e)),
    )

    return new Response(JSON.stringify({ ok: true, scheduled: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('weekly-digest error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
