// Point d'entrée unique pour la page /semaine/<jeton> (Lot 3b). Toujours en
// POST, y compris pour la simple lecture (« view ») : le client web
// (`supabase.functions.invoke`) n'envoie que des POST, et ça évite tout lien
// GET qui agirait tout seul si un scanner d'antivirus le préchargeait — le
// même piège que la réaction/désabonnement, généralisé à la lecture aussi.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { eventCategoryEmoji } from '../_shared/digest/eventStyle.ts'

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

interface DigestSendRow {
  id: string
  user_id: string
  send_date: string
  occurrence_ids: string[]
  token_expires_at: string
  reaction: string | null
  reacted_at: string | null
  unsubscribed_at: string | null
}

interface EventLite {
  id: string
  name: string
  category: string
  address: string | null
  status: string
}

function formatDateLabel(dateStart: string, time: string | null): string {
  const d = new Date(dateStart + 'T00:00:00Z')
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
  return time ? `${label} · ${time}` : label
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: { token?: string; action?: string; reaction?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  const { token, action } = body
  if (!token || typeof token !== 'string') return json({ error: 'missing_token' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: send, error: sendError } = await supabase
    .from('digest_sends')
    .select('id, user_id, send_date, occurrence_ids, token_expires_at, reaction, reacted_at, unsubscribed_at')
    .eq('token', token)
    .maybeSingle<DigestSendRow>()

  if (sendError) {
    console.error('digest-landing: lookup failed', sendError)
    return json({ error: 'lookup_failed' }, 500)
  }
  if (!send || new Date(send.token_expires_at).getTime() < Date.now()) {
    // 200, pas 404 : `supabase.functions.invoke` traite tout statut non-2xx
    // comme une erreur de transport (`data` devient `null`), ce qui rendrait
    // cet état « jeton expiré » injoignable côté page — jeton inconnu et
    // jeton expiré rendent la même réponse (pas d'oracle d'énumération).
    return json({ error: 'expired' })
  }

  if (action === 'view' || !action) {
    const occurrenceIds = send.occurrence_ids ?? []
    let items: { emoji: string; name: string; dateLabel: string; address: string | null }[] = []

    if (occurrenceIds.length > 0) {
      const { data: occurrences } = await supabase
        .from('event_occurrences')
        .select('event_id, date_start, time')
        .in('id', occurrenceIds)

      const eventIds = Array.from(new Set((occurrences ?? []).map((o) => o.event_id)))
      const { data: events } = eventIds.length
        ? await supabase.from('events').select('id, name, category, address, status').in('id', eventIds)
        : { data: [] as EventLite[] }

      const eventsById = new Map((events ?? []).filter((e) => e.status === 'published').map((e) => [e.id, e]))
      // Un event dépublié/supprimé depuis l'envoi disparaît silencieusement de
      // la liste — pas une erreur, juste moins d'items affichés (§1 du plan).
      items = (occurrences ?? [])
        .filter((o) => eventsById.has(o.event_id))
        .map((o) => {
          const ev = eventsById.get(o.event_id)!
          return {
            emoji: eventCategoryEmoji(ev.category),
            name: ev.name,
            dateLabel: formatDateLabel(o.date_start, o.time),
            address: ev.address,
          }
        })
    }

    const { data: children } = await supabase
      .from('children')
      .select('first_name')
      .eq('user_id', send.user_id)
    const childrenNames = (children ?? [])
      .map((c) => c.first_name)
      .filter((n): n is string => !!n && n.trim().length > 0)

    return json({
      sendDate: send.send_date,
      childrenNames,
      items,
      reaction: send.reaction,
      unsubscribed: !!send.unsubscribed_at,
    })
  }

  if (action === 'react') {
    const reaction = body.reaction
    if (reaction !== 'love' && reaction !== 'neutral' && reaction !== 'sad') {
      return json({ error: 'invalid_reaction' }, 400)
    }
    if (send.reaction) {
      // Déjà répondu — on renvoie l'état existant, jamais un écrasement (§3 du plan).
      return json({ recorded: false, reaction: send.reaction })
    }
    const { error: updateError } = await supabase
      .from('digest_sends')
      .update({ reaction, reacted_at: new Date().toISOString() })
      .eq('id', send.id)
      .is('reaction', null)
    if (updateError) {
      console.error('digest-landing: react update failed', updateError)
      return json({ error: 'update_failed' }, 500)
    }
    return json({ recorded: true, reaction })
  }

  if (action === 'unsubscribe') {
    if (send.unsubscribed_at) {
      return json({ recorded: false, unsubscribed: true })
    }
    // Un seul canal actif aujourd'hui (email) — le push n'existe pas encore
    // (Lot 6), donc « se désabonner » ne touche que ce booléen.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ digest_email_enabled: false })
      .eq('id', send.user_id)
    if (profileError) {
      console.error('digest-landing: profile unsubscribe failed', profileError)
      return json({ error: 'update_failed' }, 500)
    }
    const { error: sendUpdateError } = await supabase
      .from('digest_sends')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('id', send.id)
    if (sendUpdateError) console.error('digest-landing: digest_sends unsubscribe flag failed', sendUpdateError)
    return json({ recorded: true, unsubscribed: true })
  }

  return json({ error: 'unknown_action' }, 400)
})
