import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import {
  DAY_LABELS,
  dailySessions,
  eventStats,
  type PlatformKey,
  sessionsByPlatform,
  totalSessions,
  type ViewRow,
} from '../_shared/weekly-report/stats.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FALLBACK_ADMIN_EMAIL = 'bastien.boubat@gmail.com'
// Compte de test des events : exclu du dashboard admin (admin_audience_stats), donc d'ici aussi.
const EXCLUDED_TEST_EMAIL = 'bastien.boubat+event@gmail.com'
// PostgREST plafonne chaque réponse à 1000 lignes (max_rows) : sans pagination, une semaine
// de plus de 1000 pages vues est tronquée en silence.
const PAGE_SIZE = 1000

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Format court jj/mm, pour le libellé de la semaine de comparaison. */
function formatShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

/** « Sam 14/11 » pour une date seule, lue en UTC pour ne pas glisser d'un jour. */
function formatEventDate(dateStart: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStart)
  const label = new Date(dateStart).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: dateOnly ? 'UTC' : 'Europe/Paris',
  })
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

/**
 * Lit toutes les lignes de `table` créées entre `from` et `to`, par pages de 1000. `id` départage
 * les lignes de même created_at : sans tri stable, une page peut répéter ou sauter des lignes.
 * Une erreur fait échouer le rapport : mieux vaut pas de mail qu'un total faux.
 */
async function fetchRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  from: Date,
  to: Date,
  eq?: [column: string, value: string],
): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from(table)
      .select(columns)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
    if (eq) query = query.eq(eq[0], eq[1])
    const { data, error } = await query
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`${table} fetch failed: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

/** Appareils (device_id) vus au moins une fois avec un compte exclu, sur tout l'historique. */
async function fetchExcludedDevices(
  supabase: SupabaseClient,
  excludedIds: Set<string>,
): Promise<Set<string>> {
  const devices = new Set<string>()
  const ids = [...excludedIds]
  if (ids.length === 0) return devices
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('page_views')
      .select('device_id')
      .in('user_id', ids)
      .not('device_id', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`excluded devices fetch failed: ${error.message}`)
    for (const r of data ?? []) devices.add(r.device_id as string)
    if (!data || data.length < PAGE_SIZE) break
  }
  return devices
}

type UserRow = { user_id: string | null }
type ProfileRow = { id: string }

async function runReport(callerAuth: string, overrideWeekStart?: Date) {
  let lastMonday: Date
  let lastSunday: Date
  if (overrideWeekStart) {
    lastMonday = new Date(overrideWeekStart)
    lastMonday.setUTCHours(0, 0, 0, 0)
    lastSunday = new Date(lastMonday)
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6)
    lastSunday.setUTCHours(23, 59, 59, 999)
  } else {
    const now = new Date()
    lastSunday = new Date(now)
    lastSunday.setUTCDate(now.getUTCDate() - 1)
    lastSunday.setUTCHours(23, 59, 59, 999)
    lastMonday = new Date(lastSunday)
    lastMonday.setUTCDate(lastSunday.getUTCDate() - 6)
    lastMonday.setUTCHours(0, 0, 0, 0)
  }

  // Previous week (B): Monday J-14 → Sunday J-8
  const prevMonday = new Date(lastMonday)
  prevMonday.setUTCDate(lastMonday.getUTCDate() - 7)
  const prevSunday = new Date(lastSunday)
  prevSunday.setUTCDate(lastSunday.getUTCDate() - 7)

  const periodLabel = `${formatDate(lastMonday)} → ${formatDate(lastSunday)}`
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Fetch admin ids first to exclude their activity everywhere.
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
  const adminIds = new Set<string>((adminProfiles ?? []).map((p) => p.id as string))

  const { data: usersList, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  // Sans cette liste, le compte de test ne serait pas exclu et les destinataires retomberaient
  // en silence sur l'adresse de secours : mieux vaut ne pas envoyer.
  if (usersError) throw new Error(`listUsers failed: ${usersError.message}`)
  const excludedIds = new Set<string>(adminIds)
  for (const u of usersList?.users ?? []) {
    if (u.email?.toLowerCase() === EXCLUDED_TEST_EMAIL) excludedIds.add(u.id)
  }
  const isAdmin = (uid: string | null) => !!uid && excludedIds.has(uid)

  const pv = 'user_id, created_at, platform, session_id, device_id, path'
  const [
    viewsA,
    viewsB,
    contribA,
    contribB,
    proposalsA,
    proposalsB,
    profilesA,
    profilesB,
    clicksA,
  ] = await Promise.all([
    fetchRows<ViewRow>(supabase, 'page_views', pv, lastMonday, lastSunday),
    fetchRows<ViewRow>(supabase, 'page_views', pv, prevMonday, prevSunday),
    fetchRows<UserRow>(supabase, 'contributions', 'id, user_id, created_at', lastMonday, lastSunday),
    fetchRows<UserRow>(supabase, 'contributions', 'id, user_id, created_at', prevMonday, prevSunday),
    fetchRows<UserRow>(supabase, 'location_proposals', 'id, user_id, created_at', lastMonday, lastSunday),
    fetchRows<UserRow>(supabase, 'location_proposals', 'id, user_id, created_at', prevMonday, prevSunday),
    fetchRows<ProfileRow>(supabase, 'profiles', 'id, created_at', lastMonday, lastSunday),
    fetchRows<ProfileRow>(supabase, 'profiles', 'id, created_at', prevMonday, prevSunday),
    fetchRows<UserRow>(supabase, 'link_clicks', 'id, user_id, created_at', lastMonday, lastSunday, [
      'entity_type',
      'event',
    ]),
  ])

  // Admins et compte de test exclus partout. Les visites anonymes (user_id null) restent comptées.
  const notExcluded = <T extends UserRow>(rows: T[]) => rows.filter((r) => !isAdmin(r.user_id))
  const pvA = notExcluded(viewsA)
  const pvB = notExcluded(viewsB)

  const sessA = sessionsByPlatform(pvA)
  const sessB = sessionsByPlatform(pvB)

  const platformDefs: { key: PlatformKey; label: string; color: string }[] = [
    { key: 'web', label: 'Web', color: '#E8A838' },
    { key: 'ios', label: 'iOS', color: '#D95F3B' },
    { key: 'android', label: 'Android', color: '#3B7D6E' },
  ]
  const platforms = platformDefs.map((p) => ({ ...p, count: sessA[p.key], prev: sessB[p.key] }))

  const daily = dailySessions(pvA).map((d, i) => ({ label: DAY_LABELS[i], ...d }))

  // Pour les sorties, comme dans l'onglet « Top pages » (admin_top_pages) : on écarte aussi les
  // vues anonymes venues d'un appareil déjà vu avec un compte exclu. Sessions et inscrits, eux,
  // suivent admin_audience_stats, qui n'exclut que par compte.
  const excludedDevices = await fetchExcludedDevices(supabase, excludedIds)
  const notExcludedDevice = (r: ViewRow) => !r.device_id || !excludedDevices.has(r.device_id)
  const ev = eventStats(pvA.filter(notExcludedDevice), pvB.filter(notExcludedDevice))
  const topIds = ev.top.map((t) => t.id)
  const eventInfo = new Map<string, { name: string; sub: string }>()
  if (topIds.length > 0) {
    const { data: evRows, error: evError } = await supabase
      .from('events')
      .select('id, name, date_start, recurrence_label')
      .in('id', topIds)
    if (evError) throw new Error(`events fetch failed: ${evError.message}`)
    for (const e of evRows ?? []) {
      eventInfo.set(String(e.id).toLowerCase(), {
        name: (e.name as string) ?? 'Sans nom',
        sub: (e.recurrence_label as string) || (e.date_start ? formatEventDate(e.date_start as string) : ''),
      })
    }
  }
  const sorties = {
    views: ev.views,
    viewsPrev: ev.viewsPrev,
    visitors: ev.visitors,
    returningPct: ev.returningPct,
    clicks: notExcluded(clicksA).length,
    top: ev.top.map((t) => ({
      name: eventInfo.get(t.id)?.name ?? 'Sortie supprimée',
      sub: eventInfo.get(t.id)?.sub ?? '',
      views: t.views,
      deltaPct: t.deltaPct,
    })),
  }

  const countSignups = (rows: ProfileRow[]) => rows.filter((r) => !excludedIds.has(r.id)).length
  const tiles = {
    sessions: { cur: totalSessions(sessA), prev: totalSessions(sessB) },
    signups: { cur: countSignups(profilesA), prev: countSignups(profilesB) },
    contributions: { cur: notExcluded(contribA).length, prev: notExcluded(contribB).length },
    proposals: { cur: notExcluded(proposalsA).length, prev: notExcluded(proposalsB).length },
  }
  const prevPeriodLabel = formatShort(prevMonday)

  const weekKey = lastMonday.toISOString().slice(0, 10)

  // Admin recipients (emails) — reuse adminIds.
  const adminEmails: string[] = []
  for (const u of usersList?.users ?? []) {
    if (adminIds.has(u.id) && u.email) adminEmails.push(u.email)
  }
  const recipients = adminEmails.length > 0 ? adminEmails : [FALLBACK_ADMIN_EMAIL]

  for (const recipient of recipients) {
    const idempotencyKey = `weekly-admin-report-${weekKey}-${recipient}`
    try {
      const result = await sendTemplateEmail('weekly-admin-report', recipient, {
        templateData: { periodLabel, prevPeriodLabel, sorties, tiles, platforms, daily },
        idempotencyKey,
      })
      const { error: logError } = await supabase.from('email_send_log').insert({
        template_name: 'weekly-admin-report',
        recipient_email: recipient,
        status: result.sent ? 'sent' : 'suppressed',
      })
      if (logError) console.error('email_send_log insert failed', logError)
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError)
      console.error('weekly-admin-report send error', recipient, message)
      const { error: logError } = await supabase.from('email_send_log').insert({
        template_name: 'weekly-admin-report',
        recipient_email: recipient,
        status: 'failed',
        error_message: message.slice(0, 1000),
      })
      if (logError) console.error('email_send_log insert failed', logError)
    }
  }

  console.log('weekly-admin-report sent', {
    periodLabel,
    tiles,
    sorties: { ...sorties, top: sorties.top.length },
    platforms: platforms.map((p) => `${p.key}:${p.count}/${p.prev}`),
    recipients,
  })
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

    let overrideWeekStart: Date | undefined
    try {
      const body = await req.json()
      if (body?.weekStart) overrideWeekStart = new Date(body.weekStart)
    } catch {
      // no body
    }

    // @ts-ignore
    EdgeRuntime.waitUntil(
      runReport(auth, overrideWeekStart).catch(async (e) => {
        console.error('weekly-admin-report background error', e)
        // Un rapport qui n'a pas pu se construire doit laisser la même trace qu'un envoi raté.
        const message = e instanceof Error ? e.message : String(e)
        const { error: logError } = await createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
          .from('email_send_log')
          .insert({
            template_name: 'weekly-admin-report',
            recipient_email: FALLBACK_ADMIN_EMAIL,
            status: 'failed',
            error_message: message.slice(0, 1000),
          })
        if (logError) console.error('email_send_log insert failed', logError)
      }),
    )

    return new Response(JSON.stringify({ ok: true, scheduled: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('weekly-admin-report error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
