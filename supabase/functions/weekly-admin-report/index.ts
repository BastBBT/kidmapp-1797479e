import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FALLBACK_ADMIN_EMAIL = 'bastien.boubat@gmail.com'

interface UserStats {
  contributions: number
  proposals: string[]
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

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
  const isAdmin = (uid: string | null) => !!uid && adminIds.has(uid)

  const [
    { data: rawContributions },
    { data: rawProposals },
    { data: rawVisitsA },
    { data: rawVisitsB },
  ] = await Promise.all([
    supabase
      .from('contributions')
      .select('id, user_id, created_at')
      .gte('created_at', lastMonday.toISOString())
      .lte('created_at', lastSunday.toISOString()),
    supabase
      .from('location_proposals')
      .select('id, user_id, created_at, name')
      .gte('created_at', lastMonday.toISOString())
      .lte('created_at', lastSunday.toISOString()),
    supabase
      .from('page_views')
      .select('user_id, created_at')
      .gte('created_at', lastMonday.toISOString())
      .lte('created_at', lastSunday.toISOString()),
    supabase
      .from('page_views')
      .select('user_id, created_at')
      .gte('created_at', prevMonday.toISOString())
      .lte('created_at', prevSunday.toISOString()),
  ])

  // Exclude admins. Anonymous visits (user_id null) are kept.
  const contributions = (rawContributions ?? []).filter((c) => !isAdmin(c.user_id as string | null))
  const proposals = (rawProposals ?? []).filter((p) => !isAdmin(p.user_id as string | null))
  const visitsA = (rawVisitsA ?? []).filter((v) => !isAdmin(v.user_id as string | null))
  const visitsB = (rawVisitsB ?? []).filter((v) => !isAdmin(v.user_id as string | null))

  // Bucket visits A by day-of-week (Mon=0 .. Sun=6) using UTC.
  const daily = DAY_LABELS.map((label) => ({ label, count: 0 }))
  for (const v of visitsA) {
    const d = new Date(v.created_at as string)
    // getUTCDay: Sun=0..Sat=6 → convert to Mon=0..Sun=6
    const idx = (d.getUTCDay() + 6) % 7
    daily[idx].count++
  }

  const totalVisitsA = visitsA.length
  const totalVisitsB = visitsB.length
  const deltaPct = totalVisitsB === 0 ? null : Math.round(((totalVisitsA - totalVisitsB) / totalVisitsB) * 100)

  // Per-user breakdown (admins already excluded).
  const userStats: Record<string, UserStats> = {}
  for (const c of contributions) {
    if (!c.user_id) continue
    if (!userStats[c.user_id]) userStats[c.user_id] = { contributions: 0, proposals: [] }
    userStats[c.user_id].contributions++
  }
  for (const p of proposals) {
    if (!p.user_id) continue
    if (!userStats[p.user_id]) userStats[p.user_id] = { contributions: 0, proposals: [] }
    userStats[p.user_id].proposals.push((p as any).name ?? 'Sans nom')
  }

  const userIds = Object.keys(userStats)
  const userInfoMap: Record<string, { name: string; email: string }> = {}
  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  for (const u of usersList?.users ?? []) {
    if (userIds.includes(u.id)) {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>
      const name =
        (meta.full_name as string) ||
        (meta.name as string) ||
        u.email?.split('@')[0] ||
        u.id.slice(0, 8)
      userInfoMap[u.id] = { name, email: u.email ?? '' }
    }
  }

  const totalContributions = contributions.length
  const totalProposals = proposals.length
  const activeUsers = userIds.length

  const rows = Object.entries(userStats)
    .map(([userId, stats]) => {
      const info = userInfoMap[userId] ?? { name: userId.slice(0, 8), email: '' }
      return {
        name: info.name,
        email: info.email,
        contributions: stats.contributions,
        proposals: stats.proposals,
      }
    })
    .sort(
      (a, b) =>
        b.contributions + b.proposals.length - (a.contributions + a.proposals.length),
    )

  const weekKey = lastMonday.toISOString().slice(0, 10)

  // Admin recipients (emails) — reuse adminIds.
  const adminEmails: string[] = []
  for (const u of usersList?.users ?? []) {
    if (adminIds.has(u.id) && u.email) adminEmails.push(u.email)
  }
  const recipients = adminEmails.length > 0 ? adminEmails : [FALLBACK_ADMIN_EMAIL]

  const visits = { totalA: totalVisitsA, totalB: totalVisitsB, deltaPct, daily }

  for (const recipient of recipients) {
    const idempotencyKey = `weekly-admin-report-${weekKey}-${recipient}`
    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        templateName: 'weekly-admin-report',
        recipientEmail: recipient,
        idempotencyKey,
        templateData: { periodLabel, totalContributions, totalProposals, activeUsers, visits, rows },
      }),
    })

    if (!sendRes.ok) {
      const text = await sendRes.text()
      console.error('weekly-admin-report send error', recipient, sendRes.status, text)
      continue
    }
    await sendRes.text()
  }

  console.log('weekly-admin-report enqueued', {
    periodLabel,
    totalContributions,
    totalProposals,
    activeUsers,
    visits,
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
    if (parseJwtRole(req.headers.get('Authorization')) !== 'service_role') {
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
      runReport(overrideWeekStart).catch((e) =>
        console.error('weekly-admin-report background error', e),
      ),
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
