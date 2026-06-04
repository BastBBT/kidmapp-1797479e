import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const type = body?.type as 'contribution' | 'proposal' | undefined
    const recordId = body?.recordId as string | undefined

    if (!type || !['contribution', 'proposal'].includes(type) || !recordId) {
      return new Response(JSON.stringify({ error: 'Invalid body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let userId: string | null = null
    let locationId: string | null = null
    let locationName: string | null = null
    let templateName: string
    let contributionType: string | null = null

    if (type === 'contribution') {
      const { data, error } = await supabase
        .from('contributions')
        .select('user_id, location_id, type')
        .eq('id', recordId)
        .single()
      if (error || !data) {
        console.error('contribution lookup failed', error)
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = data.user_id
      locationId = data.location_id
      contributionType = data.type
      templateName = 'contribution-validated'

      if (locationId) {
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', locationId)
          .single()
        locationName = loc?.name ?? null
      }
    } else {
      const { data, error } = await supabase
        .from('location_proposals')
        .select('user_id, name')
        .eq('id', recordId)
        .single()
      if (error || !data) {
        console.error('proposal lookup failed', error)
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = data.user_id
      locationName = data.name
      templateName = 'proposal-approved'

      // Try to find the matching published location for the CTA link
      const { data: loc } = await supabase
        .from('locations')
        .select('id')
        .eq('name', data.name)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      locationId = loc?.id ?? null
    }

    if (!userId) {
      return new Response(JSON.stringify({ skipped: 'no user_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve email + full_name
    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(userId)
    if (userErr || !userRes?.user?.email) {
      console.error('user lookup failed', userErr)
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const recipientEmail = userRes.user.email

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
    const userName = profile?.full_name?.split(' ')[0] ?? undefined

    const templateData: Record<string, unknown> = {
      userName,
      locationName: locationName ?? undefined,
      locationId: locationId ?? undefined,
    }
    if (type === 'contribution' && contributionType) {
      templateData.contributionType = contributionType
    }

    const { error: invokeErr } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail,
        idempotencyKey: `${type}-${recordId}`,
        templateData,
      },
    })

    if (invokeErr) {
      console.error('send-transactional-email failed', invokeErr)
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('notify-validation error', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
