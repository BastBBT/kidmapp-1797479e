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

Deno.serve(async (_req) => {
  try {
    // Compute last week (Monday → Sunday) in local terms
    const now = new Date()
    const lastSunday = new Date(now)
    lastSunday.setUTCDate(now.getUTCDate() - 1)
    lastSunday.setUTCHours(23, 59, 59, 999)
    const lastMonday = new Date(lastSunday)
    lastMonday.setUTCDate(lastSunday.getUTCDate() - 6)
    lastMonday.setUTCHours(0, 0, 0, 0)

    const periodLabel = `${formatDate(lastMonday)} → ${formatDate(lastSunday)}`

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch contributions and proposals for the period
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

    // Aggregate per user
    const userStats: Record<string, UserStats> = {}
    for (const c of contributions ?? []) {
      if (!c.user_id) continue
      if (!userStats[c.user_id])
        userStats[c.user_id] = { contributions: 0, proposals: [] }
      userStats[c.user_id].contributions++
    }
    for (const p of proposals ?? []) {
      if (!p.user_id) continue
      if (!userStats[p.user_id])
        userStats[p.user_id] = { contributions: 0, proposals: [] }
      userStats[p.user_id].proposals.push(p.name ?? 'Sans nom')
    }

    // Resolve user emails via auth admin API
    const userIds = Object.keys(userStats)
    const userInfoMap: Record<string, { name: string; email: string }> = {}

    // listUsers is paginated; for an MVP weekly digest, fetch first 1000
    const { data: usersList } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
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
        const info = userInfoMap[userId] ?? {
          name: userId.slice(0, 8),
          email: '',
        }
        return {
          name: info.name,
          email: info.email,
          contributions: stats.contributions,
          proposals: stats.proposals,
        }
      })
      .sort(
        (a, b) =>
          b.contributions + b.proposals.length -
          (a.contributions + a.proposals.length),
      )

    // Build a unique idempotency key per week to avoid duplicate sends
    const weekKey = lastMonday.toISOString().slice(0, 10)
    const idempotencyKey = `weekly-admin-report-${weekKey}`

    // Invoke the shared transactional sender
    const { error: invokeError } = await supabase.functions.invoke(
      'send-transactional-email',
      {
        body: {
          templateName: 'weekly-admin-report',
          recipientEmail: ADMIN_EMAIL,
          idempotencyKey,
          templateData: {
            periodLabel,
            totalContributions,
            totalProposals,
            activeUsers,
            rows,
          },
        },
      },
    )

    if (invokeError) {
      throw new Error(`Failed to send admin report: ${invokeError.message}`)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        period: periodLabel,
        totalContributions,
        totalProposals,
        activeUsers,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('weekly-admin-report error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
