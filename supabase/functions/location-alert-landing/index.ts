// Point d'entrée unique pour la page /nouveaux-lieux/<jeton>. Toujours en
// POST, y compris pour la simple lecture (« view ») : même raison que
// digest-landing — un lien GET agirait tout seul si un scanner d'antivirus
// email le préchargeait.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { locationCategoryEmoji } from '../_shared/digest/locationStyle.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

interface LocationAlertSendRow {
  id: string
  user_id: string
  send_date: string
  location_ids: string[]
  token_expires_at: string
  unsubscribed_at: string | null
}

interface LocationLite {
  id: string
  name: string
  category: string
  address: string | null
  status: string
}

interface LocationItem {
  emoji: string
  name: string
  address: string | null
  url: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: { token?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  const { token, action } = body
  if (!token || typeof token !== 'string') return json({ error: 'missing_token' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: send, error: sendError } = await supabase
    .from('location_alert_sends')
    .select('id, user_id, send_date, location_ids, token_expires_at, unsubscribed_at')
    .eq('token', token)
    .maybeSingle<LocationAlertSendRow>()

  if (sendError) {
    console.error('location-alert-landing: lookup failed', sendError)
    return json({ error: 'lookup_failed' }, 500)
  }
  if (!send || new Date(send.token_expires_at).getTime() < Date.now()) {
    // 200, pas 404 : même piège `supabase.functions.invoke` déjà documenté
    // sur digest-landing — jeton inconnu et jeton expiré rendent la même
    // réponse (pas d'oracle d'énumération).
    return json({ error: 'expired' })
  }

  if (action === 'view' || !action) {
    const locationIds = send.location_ids ?? []
    let items: LocationItem[] = []

    if (locationIds.length > 0) {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name, category, address, status')
        .in('id', locationIds)
        .returns<LocationLite[]>()

      // Un lieu dépublié/supprimé depuis l'envoi disparaît silencieusement de
      // la liste — même comportement que digest-landing pour les events.
      items = (locations ?? [])
        .filter((l) => l.status === 'published')
        .map((l) => ({
          emoji: locationCategoryEmoji(l.category),
          name: l.name,
          address: l.address,
          url: `https://kidmapp.app/location/${l.id}`,
        }))
    }

    return json({
      sendDate: send.send_date,
      items,
      unsubscribed: !!send.unsubscribed_at,
    })
  }

  if (action === 'unsubscribe') {
    if (send.unsubscribed_at) {
      return json({ recorded: false, unsubscribed: true })
    }
    // Même case que le digest sorties (digest_email_enabled) — décision du
    // 2026-09-07 de ne pas ajouter un 2e toggle, un mail email = un canal.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ digest_email_enabled: false })
      .eq('id', send.user_id)
    if (profileError) {
      console.error('location-alert-landing: profile unsubscribe failed', profileError)
      return json({ error: 'update_failed' }, 500)
    }
    const { error: sendUpdateError } = await supabase
      .from('location_alert_sends')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', send.id)
    if (sendUpdateError) console.error('location-alert-landing: unsubscribe flag failed', sendUpdateError)
    return json({ recorded: true, unsubscribed: true })
  }

  return json({ error: 'unknown_action' }, 400)
})
