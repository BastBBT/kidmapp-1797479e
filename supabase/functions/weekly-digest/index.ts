import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { haversineKm } from '../_shared/digest/haversine.ts'
import { ageInMonths, ageMatches } from '../_shared/digest/matching.ts'
import { eventCategoryEmoji } from '../_shared/digest/eventStyle.ts'
import {
  capGroups,
  categoryAllowed,
  daysInWindow,
  digestMode,
  groupItems,
  holidayInWindow,
  isWeekendISO,
  parseDigestDays,
  wantedDaysOf,
  type DigestMode,
  type DigestPrefs,
  type ItemGroup,
  type SchoolHoliday,
} from '../_shared/digest/preferences.ts'
import { loadServiceAccount, loadDevicesByUser, sendToUserDevices, type DeviceRow } from '../_shared/push/dispatch.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LANDING_BASE_URL = 'https://kidmapp.app/semaine'
// Fenêtre de la sélection : 30 jours (D9 du chantier profil famille) — le
// jeton reste valable le temps que le parent ouvre son mail en retard.
const TOKEN_TTL_DAYS = 30
// Plafond d'items affichés dans le mail (le week-end passe en premier) ; la
// page `/semaine/<jeton>` garde la liste complète, stockée dans digest_sends.
const MAX_EMAIL_ITEMS = 8
// Nantes = académie de Nantes = zone B. Tous les profils sont dans la région :
// pas de zone par profil tant que le catalogue ne sort pas de la zone B.
const SCHOOL_ZONE = 'B'
// Lien « Modifier mes préférences » du mail : section Ma sélection hebdo de
// Mon compte (web ; l'app s'ouvre si le lien universel la couvre).
const PREFERENCES_URL = 'https://kidmapp.app/account'
// Même vocabulaire que la contrainte events_category_check.
const EVENT_CATEGORIES = ['Spectacle', 'Atelier', 'Festival', 'Fête', 'Marché', 'Exposition', 'Autre']

interface ProfileRow {
  id: string
  zone_lat: number | null
  zone_lng: number | null
  zone_radius_km: number | null
  digest_email_enabled: boolean
  digest_push_enabled: boolean
  digest_days: string | null
  digest_holidays_all_week: boolean | null
  digest_event_categories: string[] | null
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

/** Libère une réservation `digest_sends` après un échec d'envoi — sans ça, la
 * contrainte unique (user_id, send_date) empêcherait tout retry le même jour. */
async function releaseClaim(supabase: any, id: string): Promise<void> {
  const { error } = await supabase.from('digest_sends').delete().eq('id', id)
  if (error) console.error('weekly-digest: releaseClaim failed', id, error)
}

function todayISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysISO(d: Date, days: number): string {
  const copy = new Date(d)
  copy.setUTCDate(copy.getUTCDate() + days)
  return todayISODate(copy)
}

function formatDateLabel(occ: OccurrenceRow, sendDate: string): string {
  // Expo / festival déjà commencé : sa date de début (parfois des semaines
  // plus tôt) ne dit rien au parent, la date de fin si.
  if (occ.date_start < sendDate && occ.date_end && occ.date_end >= sendDate) {
    const end = new Date(occ.date_end + 'T00:00:00Z')
    const day = end.getUTCDate()
    const month = end.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
    return `Jusqu'au ${day === 1 ? '1er' : day} ${month}`
  }
  const d = new Date(occ.date_start + 'T00:00:00Z')
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
  return occ.time ? `${label} · ${occ.time}` : label
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function utcDate(iso: string): Date {
  return new Date(iso + 'T00:00:00Z')
}

/** « samedi 10 octobre » */
function dayTitle(iso: string): string {
  return utcDate(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** « sam. 10 » */
function shortDay(iso: string): string {
  return utcDate(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** « oct. » */
function shortMonth(iso: string): string {
  return utcDate(iso).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
}

/** « 1er novembre », « 2 novembre » */
function longDateLabel(iso: string): string {
  const d = utcDate(iso)
  const day = d.getUTCDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' })
  return `${day === 1 ? '1er' : day} ${month}`
}

/** « sam. 10 et dim. 11 oct. » (ou « sam. 31 oct. et dim. 1 nov. » à cheval sur deux mois). */
function weekendRangeLabel(days: string[]): string | null {
  if (days.length === 0) return null
  const sorted = [...days].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (first === last) return `${shortDay(first)} ${shortMonth(first)}`
  if (first.slice(0, 7) === last.slice(0, 7)) return `${shortDay(first)} et ${shortDay(last)} ${shortMonth(last)}`
  return `${shortDay(first)} ${shortMonth(first)} et ${shortDay(last)} ${shortMonth(last)}`
}

/** « du 22 au 28 oct. » (ou « du 29 oct. au 4 nov. »). */
function windowRangeLabel(first: string, last: string): string {
  const d1 = utcDate(first).getUTCDate()
  const d2 = utcDate(last).getUTCDate()
  if (first.slice(0, 7) === last.slice(0, 7)) return `du ${d1} au ${d2} ${shortMonth(last)}`
  return `du ${d1} ${shortMonth(first)} au ${d2} ${shortMonth(last)}`
}

function groupHeading(
  group: ItemGroup<unknown>,
  mode: DigestMode,
  windowDays: string[],
): { title: string; subtitle: string | null } {
  switch (group.kind) {
    case 'day':
      return { title: capitalize(dayTitle(group.day!)), subtitle: null }
    case 'whole_weekend':
      return { title: 'Tout le week-end', subtitle: null }
    case 'this_weekend':
      return { title: 'Ce week-end', subtitle: weekendRangeLabel(windowDays.filter(isWeekendISO)) }
    case 'rest_of_week':
      return group.day
        ? { title: capitalize(dayTitle(group.day)), subtitle: null }
        : { title: 'Le reste de la semaine', subtitle: mode === 'holidays' ? 'vacances scolaires' : null }
  }
}

/** Rappel discret sous le bouton du mail quand le parent a restreint les types. */
function eventCategoriesSummary(chosen: string[] | null): string | null {
  if (!chosen || chosen.length === 0) return null
  const excluded = EVENT_CATEGORIES.filter((c) => !chosen.includes(c))
  if (excluded.length === 0) return null
  if (excluded.length <= 2) return `tout sauf ${excluded.join(' et ')}`
  return EVENT_CATEGORIES.filter((c) => chosen.includes(c)).join(', ')
}

function pushCopy(mode: DigestMode, count: number): { title: string; body: string } {
  const ideas = `${count} idée${count > 1 ? 's' : ''} pour ta famille`
  if (mode === 'weekend') return { title: 'Ton week-end en famille 🎈', body: `${ideas}, samedi et dimanche.` }
  if (mode === 'holidays') return { title: "C'est les vacances 🎈", body: `${ideas}, toute la semaine.` }
  return { title: 'Ta sélection de la semaine 👀', body: `${count} sortie${count > 1 ? 's' : ''} pour ta famille cette semaine.` }
}

async function runDigest() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()
  const dow = now.getUTCDay() // 0=dimanche..6=samedi, même convention que EXTRACT(DOW)
  const sendDate = todayISODate(now)
  const windowEnd = addDaysISO(now, 7)

  // (a) Candidats du jour : au moins un canal actif (email ou push — cases
  // indépendantes, cf. AccountView/profile_sections), jour d'envoi =
  // aujourd'hui, zone renseignée.
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(
      'id, zone_lat, zone_lng, zone_radius_km, digest_email_enabled, digest_push_enabled, digest_days, digest_holidays_all_week, digest_event_categories',
    )
    .or('digest_email_enabled.eq.true,digest_push_enabled.eq.true')
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
  //
  // Un simple `date_start` dans [J, J+7) exclurait une expo en cours (démarrée
  // avant J, qui se termine après J) — même défaut que celui déjà repéré et
  // corrigé côté web sur `useEvents.ts`/`eventCalendar.ts` (§ fix « Tous les
  // âges affichait moins d'événements » du 2026-09-03). On reprend le même
  // critère de chevauchement : occurrence commençant dans la fenêtre, OU
  // encore en cours pendant la fenêtre (`date_end` non atteint), les deux
  // bornées par un début avant la fin de fenêtre pour ne pas remonter un
  // événement qui ne fait que démarrer bien plus tard.
  const { data: occurrences, error: occError } = await supabase
    .from('event_occurrences')
    .select('id, event_id, date_start, date_end, time')
    .or(
      `and(date_start.gte.${sendDate},date_start.lt.${windowEnd}),and(date_end.gte.${sendDate},date_start.lt.${windowEnd})`,
    )
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

  // Vacances scolaires qui chevauchent la fenêtre. Un échec de lecture ne
  // bloque pas l'envoi : on retombe sur « pas de vacances », donc au pire un
  // parent « week-end » ne reçoit que le week-end, jamais l'inverse.
  const windowDays = daysInWindow(sendDate, windowEnd)
  const { data: holidayRows, error: holidaysError } = await supabase
    .from('school_holidays')
    .select('label, first_day, last_day')
    .eq('zone', SCHOOL_ZONE)
    .lte('first_day', windowDays[windowDays.length - 1])
    .gte('last_day', sendDate)
    .returns<SchoolHoliday[]>()
  if (holidaysError) console.error('weekly-digest: school_holidays fetch failed', holidaysError)
  const holidays = holidayRows ?? []

  // (c) Tokens push des candidats concernés — une seule requête batchée,
  // jamais une lecture par utilisateur dans la boucle plus bas.
  let serviceAccount = loadServiceAccount()
  const pushCandidateIds = candidates.filter((p) => p.digest_push_enabled).map((p) => p.id)
  const devicesByUser = serviceAccount
    ? await loadDevicesByUser(supabase, pushCandidateIds, 'weekly-digest')
    : new Map<string, DeviceRow[]>()

  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0
  let pushSentCount = 0
  let pushFailedCount = 0

  for (const profile of candidates) {
    const children = childrenByUser.get(profile.id)!
    const ages = children.map((c) => ageInMonths(c.birth_month, c.birth_year, now))

    const prefs: DigestPrefs = {
      digestDays: parseDigestDays(profile.digest_days),
      holidaysAllWeek: profile.digest_holidays_all_week ?? true,
      eventCategories: profile.digest_event_categories,
    }

    const matched: { occ: OccurrenceRow; wantedDays: string[] }[] = []
    for (const occ of validOccurrences) {
      const ev = eventsById.get(occ.event_id)!
      const ageOk = ages.some((age) => ageMatches(age, ev.age_min_months, ev.age_max_months))
      if (!ageOk) continue
      if (ev.lat === null || ev.lng === null) continue
      const distance = haversineKm(profile.zone_lat!, profile.zone_lng!, ev.lat, ev.lng)
      if (distance > (profile.zone_radius_km ?? 12)) continue
      if (!categoryAllowed(ev.category, prefs.eventCategories)) continue
      // Jours dispo + vacances : une occurrence reste si elle a lieu au moins
      // un jour voulu de la fenêtre (une expo en cours garde son week-end).
      const wantedDays = wantedDaysOf(occ, windowDays, prefs, holidays)
      if (wantedDays.length === 0) continue
      matched.push({ occ, wantedDays })
    }

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
          occurrence_ids: matched.map((m) => m.occ.id),
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

    const childrenNames = children.map((c) => c.first_name).filter((n): n is string => !!n && n.trim().length > 0)
    const landingUrl = `${LANDING_BASE_URL}/${token}`
    const mode = digestMode(windowDays, prefs, holidays)
    const allItems = matched.map(({ occ, wantedDays }) => {
      const ev = eventsById.get(occ.event_id)!
      return {
        wantedDays,
        emoji: eventCategoryEmoji(ev.category),
        name: ev.name,
        dateLabel: formatDateLabel(occ, sendDate),
        address: ev.address,
        // Lien universel : ouvre l'app si elle est installée, la fiche web
        // sinon. Même forme que le mail « nouveaux lieux ».
        url: `https://kidmapp.app/event/${ev.id}`,
      }
    })
    const groups = capGroups(groupItems(allItems, mode), MAX_EMAIL_ITEMS).map((g) => ({
      ...groupHeading(g, mode, windowDays),
      items: g.items.map(({ wantedDays: _wantedDays, ...item }) => item),
    }))
    const holiday = mode === 'holidays' ? holidayInWindow(windowDays, holidays) : null
    const templateData = {
      childrenNames,
      landingUrl,
      mode,
      totalCount: allItems.length,
      groups,
      rangeLabel:
        mode === 'weekend'
          ? weekendRangeLabel(windowDays.filter(isWeekendISO))
          : mode === 'holidays'
            ? windowRangeLabel(windowDays[0], windowDays[windowDays.length - 1])
            : null,
      holiday: holiday
        ? { label: holiday.label, untilLabel: longDateLabel(holiday.last_day), filtered: prefs.digestDays !== 'all' }
        : null,
      categoriesLabel: eventCategoriesSummary(prefs.eventCategories),
      preferencesUrl: PREFERENCES_URL,
    }

    // Les deux canaux sont indépendants (cases à cocher séparées) : un profil
    // peut n'avoir que l'un des deux actif. La réservation du jour n'est
    // libérée que si NI l'un NI l'autre n'est parti — un seul canal réussi
    // suffit à considérer le parent servi aujourd'hui.
    let anySucceeded = false

    if (profile.digest_email_enabled) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id)
      const email = userData?.user?.email
      if (userError || !email) {
        console.error('weekly-digest: email introuvable', profile.id, userError)
        failedCount++
      } else {
        const idempotencyKey = `weekly-digest-${sendDate}-${profile.id}`
        try {
          const result = await sendTemplateEmail('weekly-digest', email, {
            templateData,
            idempotencyKey,
          })
          const { error: logError } = await supabase.from('email_send_log').insert({
            template_name: 'weekly-digest',
            recipient_email: email,
            status: result.sent ? 'sent' : 'suppressed',
          })
          if (logError) console.error('email_send_log insert failed', logError)
          sentCount++
          anySucceeded = true
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
    }

    if (profile.digest_push_enabled && serviceAccount) {
      const devices = devicesByUser.get(profile.id) ?? []
      const push = pushCopy(mode, allItems.length)
      const result = await sendToUserDevices(
        supabase,
        serviceAccount,
        profile.id,
        devices,
        // `type` route le tap côté app (iOS/Android) vers l'onglet Sorties,
        // déjà filtré par défaut sur la semaine en cours + l'enfant sélectionné
        // — pas de landing page dédiée dans l'app, contrairement à l'email.
        { title: push.title, body: push.body, data: { type: 'weekly_digest' } },
        'weekly-digest',
      )
      pushSentCount += result.sent
      pushFailedCount += result.failed
      if (result.sent > 0) anySucceeded = true
      if (result.authFailed) serviceAccount = null
    }

    if (!anySucceeded) {
      // Sans ce retrait, un run qui n'a servi le parent sur aucun canal
      // consommerait quand même le créneau du jour (contrainte unique
      // user_id/send_date) : un re-run le même jour ne retenterait jamais,
      // jusqu'au prochain digest_day dans une semaine.
      await releaseClaim(supabase, claimed[0].id)
    }
  }

  console.log('weekly-digest terminé', {
    sendDate,
    candidats: candidates.length,
    sentCount,
    skippedCount,
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
