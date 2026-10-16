import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { welcomeRecipients, type WelcomeCandidate } from '../_shared/welcome/eligibility.ts'

// Mail de bienvenue, envoyé une seule fois ~1 h après l'inscription (cron
// horaire). Pas de colonne dédiée : le dédoublonnage s'appuie sur
// `email_send_log` (template 'welcome'), doublé d'une clé d'idempotence par
// compte côté Lovable si deux runs se chevauchaient.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TEMPLATE = 'welcome'
const PER_PAGE = 1000

async function listAllUsers(supabase: ReturnType<typeof createClient>): Promise<WelcomeCandidate[]> {
  const users: WelcomeCandidate[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (error) throw error
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < PER_PAGE) return users
  }
}

async function runWelcome() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()

  const users = await listAllUsers(supabase)

  // Un envoi « failed » ne compte pas : il sera retenté au run suivant, tant
  // que le compte reste dans la fenêtre de rattrapage.
  const { data: logRows, error: logError } = await supabase
    .from('email_send_log')
    .select('recipient_email')
    .eq('template_name', TEMPLATE)
    .in('status', ['sent', 'suppressed'])
  if (logError) {
    // Sans le journal, impossible de savoir qui a déjà été accueilli : on
    // n'envoie rien plutôt que de risquer un doublon.
    console.error('welcome-email: lecture email_send_log impossible (run annulé)', logError)
    return
  }
  const alreadySent = new Set(
    (logRows ?? []).map((r: { recipient_email: string }) => r.recipient_email.toLowerCase()),
  )

  const recipients = welcomeRecipients(users, alreadySent, now)
  let sentCount = 0
  let failedCount = 0

  for (const user of recipients) {
    const email = user.email!
    try {
      const result = await sendTemplateEmail(TEMPLATE, email, {
        idempotencyKey: `welcome-${user.id}`,
      })
      const { error } = await supabase.from('email_send_log').insert({
        template_name: TEMPLATE,
        recipient_email: email,
        status: result.sent ? 'sent' : 'suppressed',
      })
      if (error) console.error('email_send_log insert failed', error)
      sentCount++
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError)
      console.error('welcome-email send error', user.id, message)
      const { error } = await supabase.from('email_send_log').insert({
        template_name: TEMPLATE,
        recipient_email: email,
        status: 'failed',
        error_message: message.slice(0, 1000),
      })
      if (error) console.error('email_send_log insert failed', error)
      failedCount++
    }
  }

  console.log('welcome-email done', {
    scanned: users.length,
    eligible: recipients.length,
    sentCount,
    failedCount,
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
      runWelcome().catch((e) => console.error('welcome-email background error', e)),
    )

    return new Response(JSON.stringify({ ok: true, scheduled: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('welcome-email error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
