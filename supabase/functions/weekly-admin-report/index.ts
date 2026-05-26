import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL = 'bastien.boubat@gmail.com'

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

async function runReport(overrideWeekStart?: Date) {
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

  const periodLabel = `${formatDate(lastMonday)} → ${formatDate(lastSunday)}`
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const [{ data: contributions }, { data: proposals }] = await Promise.all([
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
  ])

  const userStats: Record<string, UserStats> = {}
  for (const c of contributions ?? []) {
    if (!c.user_id) continue
    if (!userStats[c.user_id]) userStats[c.user_id] = { contributions: 0, proposals: [] }
    userStats[c.user_id].contributions++
  }
  for (const p of proposals ?? []) {
    if (!p.user_id) continue
    if (!userStats[p.user_id]) userStats[p.user_id] = { contributions: 0, proposals: [] }
    userStats[p.user_id].proposals.push(p.name ?? 'Sans nom')
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

  const totalContributions = (contributions ?? []).length
  const totalProposals = (proposals ?? []).length
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
  const idempotencyKey = `weekly-admin-report-${weekKey}`

  const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'weekly-admin-report',
      recipientEmail: ADMIN_EMAIL,
      idempotencyKey,
      templateData: { periodLabel, totalContributions, totalProposals, activeUsers, rows },
    },
  })

  if (invokeError) {
    console.error('weekly-admin-report invoke error', invokeError)
    throw new Error(`Failed to send admin report: ${invokeError.message}`)
  }

  console.log('weekly-admin-report enqueued', {
    periodLabel,
    totalContributions,
    totalProposals,
    activeUsers,
  })
}

// @ts-ignore EdgeRuntime is provided by Supabase runtime
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

Deno.serve(async (req) => {
  try {
    let overrideWeekStart: Date | undefined
    try {
      const body = await req.json()
      if (body?.weekStart) overrideWeekStart = new Date(body.weekStart)
    } catch {
      // no body / not JSON — use default (last week)
    }

    // Run in background so we ACK fast (pg_cron net.http_post default timeout is 5s)
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
