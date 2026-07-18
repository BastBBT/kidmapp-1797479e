import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth: this function is only called from a DB trigger via pg_net using the
  // service role key. Accept any JWT whose role claim is service_role
  // (byte equality breaks when Supabase rotates the key).
  const authHeader = req.headers.get('Authorization') ?? ''
  const parseJwtRole = (h: string): string | null => {
    if (!h.startsWith('Bearer ')) return null
    const token = h.slice(7)
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
  if (parseJwtRole(authHeader) !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''


  try {
    const body = await req.json()
    const type = body?.type as 'contribution' | 'proposal' | 'event' | undefined
    const recordId = body?.recordId as string | undefined

    if (!type || !['contribution', 'proposal', 'event'].includes(type) || !recordId) {
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
    let locationCategory: string | null = null
    let templateName: string
    let contributionType: string | null = null
    let eventTitle: string | null = null
    let eventCategory: string | null = null
    let eventStartDate: string | null = null

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
          .select('name, category')
          .eq('id', locationId)
          .single()
        locationName = loc?.name ?? null
        locationCategory = loc?.category ?? null
      }
    } else if (type === 'event') {
      const { data, error } = await supabase
        .from('events')
        .select('user_id, title, category, start_date')
        .eq('id', recordId)
        .single()
      if (error || !data) {
        console.error('event lookup failed', error)
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = data.user_id
      eventTitle = data.title
      eventCategory = data.category
      eventStartDate = data.start_date
      templateName = 'event-published'
    } else {
      const { data, error } = await supabase
        .from('location_proposals')
        .select('user_id, name, category')
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
      locationCategory = data.category
      templateName = 'proposal-approved'

      // Try to find the matching published location for the CTA link
      const { data: loc } = await supabase
        .from('locations')
        .select('id, category')
        .eq('name', data.name)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      locationId = loc?.id ?? null
      if (loc?.category) locationCategory = loc.category
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

    const templateData: Record<string, unknown> = { userName }
    if (type === 'event') {
      templateData.eventTitle = eventTitle ?? undefined
      templateData.eventId = recordId
      templateData.eventCategory = eventCategory ?? undefined
      templateData.eventStartDate = eventStartDate ?? undefined
    } else {
      templateData.locationName = locationName ?? undefined
      templateData.locationId = locationId ?? undefined
      templateData.locationCategory = locationCategory ?? undefined
      if (type === 'contribution' && contributionType) {
        templateData.contributionType = contributionType
      }
    }

    // send-transactional-email enforces service_role caller — use the service key.
    const sendRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')!}/functions/v1/send-transactional-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          templateName,
          recipientEmail,
          idempotencyKey: `${type}-${recordId}`,
          templateData,
        }),
      },
    )

    if (!sendRes.ok) {
      const text = await sendRes.text()
      console.error('send-transactional-email failed', sendRes.status, text)
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
