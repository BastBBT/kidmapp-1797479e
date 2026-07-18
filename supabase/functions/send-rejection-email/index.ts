import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      templateName: 'submission-rejected',
      recipientEmail,
      idempotencyKey: `reject-${submissionType}-${submissionId}-${Date.now()}`,
      templateData: {
        userName: recipientName || undefined,
        submissionType,
        submissionName,
        reason,
      },
    }),
  })

  if (!sendRes.ok) {
    const text = await sendRes.text()
    console.error('send-transactional-email failed', sendRes.status, text)
    return new Response(JSON.stringify({ error: 'Failed to send', details: text }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
