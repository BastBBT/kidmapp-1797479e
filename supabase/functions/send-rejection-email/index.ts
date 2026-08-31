import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const token = authHeader.slice(7)
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const userId = claimsData.claims.sub as string

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: isAdmin, error: adminErr } = await admin.rpc('is_admin', { _user_id: userId })
  if (adminErr || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { submissionType, submissionName, submissionId, recipientEmail, recipientName, reason } = body ?? {}
  if (!submissionType || !submissionId || !recipientEmail || !reason) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const idempotencyKey = `reject-${submissionType}-${submissionId}-${Date.now()}`

  const templateData = {
    userName: recipientName || undefined,
    submissionType,
    submissionName,
    reason,
  }

  try {
    const result = await sendTemplateEmail('submission-rejected', String(recipientEmail), {
      templateData,
      idempotencyKey,
    })

    const { error: logError } = await admin.from('email_send_log').insert({
      template_name: 'submission-rejected',
      recipient_email: recipientEmail,
      status: result.sent ? 'sent' : 'suppressed',
    })
    if (logError) console.error('email_send_log insert failed', logError)

    if (!result.sent) {
      return new Response(JSON.stringify({ success: false, reason: 'email_suppressed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : String(sendError)
    console.error('send failed', message)
    const { error: logError } = await admin.from('email_send_log').insert({
      template_name: 'submission-rejected',
      recipient_email: recipientEmail,
      status: 'failed',
      error_message: message.slice(0, 1000),
    })
    if (logError) console.error('email_send_log insert failed', logError)

    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
