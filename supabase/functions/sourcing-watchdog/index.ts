import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { checkRuns, SCHEDULES, type SourcingRun } from '../_shared/sourcing/watchdog.ts'

// Appelée chaque jour par pg_cron (17:00 UTC). Vérifie que les routines de collecte d'events prévues
// dans les 24 h précédentes ont bien écrit leur ligne dans `sourcing_runs`, et prévient Bastien sinon.
// Silencieuse quand tout va bien.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ALERT_EMAIL = 'bastien.boubat@gmail.com'

function parseJwtRole(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const payload = authHeader.slice(7).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = JSON.parse(atob(padded))
    return typeof json?.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (parseJwtRole(req.headers.get('Authorization')) !== 'service_role') {
    return json({ error: 'Unauthorized' }, 401)
  }
  try {
    const now = new Date()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const since = new Date(now.getTime() - 3 * 24 * 3600_000).toISOString()
    const { data, error } = await supabase
      .from('sourcing_runs')
      .select('routine,status,started_at,inserted,error')
      .gte('started_at', since)
    if (error) throw error

    const verdicts = checkRuns(now, (data ?? []) as SourcingRun[])
    if (verdicts.length === 0) return json({ ok: true, alerts: 0 })

    const alerts = verdicts.map((v) => ({
      label: SCHEDULES[v.routine].label,
      scheduledAt: v.scheduledAt,
      problem: v.problem,
      detail: 'detail' in v ? v.detail : null,
    }))
    // Une clé par run jugé : une relance de la fonction le même jour ne renvoie pas le mail.
    const idempotencyKey = `sourcing-alert-${verdicts.map((v) => `${v.routine}@${v.scheduledAt}`).join(',')}`
    const result = await sendTemplateEmail('sourcing-alert', ALERT_EMAIL, {
      templateData: { alerts },
      idempotencyKey,
    })

    const { error: logError } = await supabase.from('email_send_log').insert({
      template_name: 'sourcing-alert',
      recipient_email: ALERT_EMAIL,
      status: result.sent ? 'sent' : 'suppressed',
    })
    if (logError) console.error('email_send_log insert failed', logError)

    console.log('sourcing-watchdog alert', alerts)
    return json({ ok: true, alerts: alerts.length })
  } catch (e) {
    console.error('sourcing-watchdog error', e)
    return json({ error: String(e) }, 500)
  }
})
