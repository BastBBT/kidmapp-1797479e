import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as rejectedTemplate } from '../_shared/transactional-email-templates/submission-rejected.tsx'

const SITE_NAME = 'kidmapp'
const SENDER_DOMAIN = 'notify.kidmapp.app'
const FROM_DOMAIN = 'kidmapp.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
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

  const normalizedEmail = String(recipientEmail).toLowerCase()
  const messageId = crypto.randomUUID()
  const idempotencyKey = `reject-${submissionType}-${submissionId}-${Date.now()}`

  // Suppression check
  const { data: suppressed, error: suppressionError } = await admin
    .from('suppressed_emails').select('id').eq('email', normalizedEmail).maybeSingle()
  if (suppressionError) {
    return new Response(JSON.stringify({ error: 'Suppression check failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (suppressed) {
    await admin.from('email_send_log').insert({
      message_id: messageId, template_name: 'submission-rejected',
      recipient_email: recipientEmail, status: 'suppressed',
    })
    return new Response(JSON.stringify({ success: false, reason: 'email_suppressed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Unsubscribe token (get or create)
  let unsubscribeToken: string
  const { data: existingToken } = await admin
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalizedEmail).maybeSingle()
  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else {
    unsubscribeToken = generateToken()
    await admin.from('email_unsubscribe_tokens').upsert(
      { token: unsubscribeToken, email: normalizedEmail },
      { onConflict: 'email', ignoreDuplicates: true }
    )
    const { data: stored } = await admin
      .from('email_unsubscribe_tokens').select('token').eq('email', normalizedEmail).maybeSingle()
    if (stored?.token) unsubscribeToken = stored.token
  }

  const templateData = {
    userName: recipientName || undefined,
    submissionType,
    submissionName,
    reason,
  }

  const html = await renderAsync(React.createElement(rejectedTemplate.component, templateData))
  const plainText = await renderAsync(React.createElement(rejectedTemplate.component, templateData), { plainText: true })
  const subject = typeof rejectedTemplate.subject === 'function'
    ? rejectedTemplate.subject(templateData) : rejectedTemplate.subject

  await admin.from('email_send_log').insert({
    message_id: messageId, template_name: 'submission-rejected',
    recipient_email: recipientEmail, status: 'pending',
  })

  const { error: enqueueError } = await admin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: 'submission-rejected',
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('enqueue failed', enqueueError)
    await admin.from('email_send_log').insert({
      message_id: messageId, template_name: 'submission-rejected',
      recipient_email: recipientEmail, status: 'failed', error_message: 'enqueue failed',
    })
    return new Response(JSON.stringify({ error: 'Failed to enqueue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
