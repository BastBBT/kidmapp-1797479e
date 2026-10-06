// Horaires d'ouverture des lieux, alimentés par Google Places API (New).
//
// Trois modes (body JSON `{ mode, location_id?, dry_run? }`) :
//   - batch  : rafraîchit tous les lieux qui ont un google_place_id, sauf ceux saisis à la main
//              (opening_hours_source = 'manuel'). Appelé par le cron mensuel.
//   - single : rafraîchit un seul lieu (location_id), MÊME s'il était en saisie manuelle —
//              c'est le bouton « Resynchroniser depuis Google » de l'admin.
//   - match  : cherche le google_place_id des lieux qui n'en ont pas (Text Search). N'écrit que
//              les correspondances sûres et renvoie le reste pour vérification manuelle.
//              `dry_run: true` renvoie le rapport sans rien écrire.
//
// Accès : JWT service_role (cron) ou JWT d'un admin (is_admin). La clé Google ne quitte jamais
// cette fonction.
//
// CGU Google : seul le place_id peut être conservé indéfiniment. opening_hours est un cache
// rafraîchi chaque mois, daté par opening_hours_updated_at, que les clients affichent.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

const PLACES_BASE = 'https://places.googleapis.com/v1'

// Garde-fou budgétaire : plafond d'appels Google par exécution, quel que soit l'état du compte
// Google Cloud (pas de quota réglable pendant l'essai sans frais). ~250 lieux aujourd'hui.
const MAX_GOOGLE_CALLS_PER_RUN = 300
const CONCURRENCY = 5

// Critères d'une correspondance « sûre » en mode match.
const MATCH_MIN_NAME_SCORE = 0.6
const MATCH_MAX_DISTANCE_M = 250

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Mode = 'batch' | 'single' | 'match'

interface TimePoint { day: number; hour: number; minute: number }
interface Period { open: TimePoint; close?: TimePoint }

interface LocationRow {
  id: string
  name: string
  address: string | null
  city: string
  lat: number
  lng: number
  google_place_id: string | null
  opening_hours_source: string | null
}

class CallBudget {
  used = 0
  constructor(private readonly max: number) {}
  take(): boolean {
    if (this.used >= this.max) return false
    this.used++
    return true
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseJwtRole(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const parts = authHeader.slice(7).split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = JSON.parse(atob(padded))
    return typeof decoded?.role === 'string' ? decoded.role : null
  } catch {
    return null
  }
}

async function isAdminCaller(admin: SupabaseClient, authHeader: string): Promise<boolean> {
  const { data: userData, error } = await admin.auth.getUser(authHeader.slice(7))
  if (error || !userData?.user?.id) return false
  const { data: isAdmin, error: roleErr } = await admin.rpc('is_admin', { _user_id: userData.user.id })
  return !roleErr && isAdmin === true
}

// Exécute `fn` sur chaque élément avec au plus `limit` appels en vol.
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Sync des horaires (batch / single)
// ---------------------------------------------------------------------------

interface GoogleTimePoint { day?: number; hour?: number; minute?: number }
interface GooglePeriod { open?: GoogleTimePoint; close?: GoogleTimePoint }
interface GooglePlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
}

function toTimePoint(raw: GoogleTimePoint | undefined): TimePoint | null {
  if (!raw || typeof raw.day !== 'number') return null
  return { day: raw.day, hour: raw.hour ?? 0, minute: raw.minute ?? 0 }
}

// Ne garde que day/hour/minute : Google ajoute parfois une `date` et des drapeaux de troncature
// qui n'ont pas de sens dans un cache mensuel.
function normalizePeriods(rawPeriods: GooglePeriod[]): Period[] {
  const periods: Period[] = []
  for (const p of rawPeriods) {
    const open = toTimePoint(p?.open)
    if (!open) continue
    const close = toTimePoint(p?.close)
    // Pas de `close` = ouvert 24h/24 (convention Google, une seule période day 0 00:00).
    periods.push(close ? { open, close } : { open })
  }
  return periods
}

type SyncOutcome =
  | { id: string; name: string; status: 'updated' | 'no_hours' }
  | { id: string; name: string; status: 'error'; error: string }
  | { id: string; name: string; status: 'skipped_budget' }

async function syncOne(
  admin: SupabaseClient,
  loc: LocationRow,
  budget: CallBudget,
): Promise<SyncOutcome> {
  const base = { id: loc.id, name: loc.name }
  if (!loc.google_place_id) return { ...base, status: 'error', error: 'no_place_id' }
  if (!budget.take()) return { ...base, status: 'skipped_budget' }

  try {
    const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(loc.google_place_id)}`, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_KEY!,
        // `id` est gratuit (IDs Only) et permet de suivre un place_id que Google a fait évoluer.
        'X-Goog-FieldMask': 'id,regularOpeningHours',
      },
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      console.warn('place details failed', loc.id, res.status, detail)
      return { ...base, status: 'error', error: `google_${res.status}` }
    }
    const place = await res.json()
    const rawPeriods = place?.regularOpeningHours?.periods
    const periods = Array.isArray(rawPeriods) ? normalizePeriods(rawPeriods) : []

    const update: Record<string, unknown> = {
      opening_hours: periods.length > 0 ? { periods } : null,
      opening_hours_source: 'google_auto',
      opening_hours_updated_at: new Date().toISOString(),
    }
    if (typeof place?.id === 'string' && place.id !== loc.google_place_id) {
      update.google_place_id = place.id
    }

    const { error } = await admin.from('locations').update(update).eq('id', loc.id)
    if (error) {
      console.error('update failed', loc.id, error.message)
      return { ...base, status: 'error', error: 'db_update_failed' }
    }
    return { ...base, status: periods.length > 0 ? 'updated' : 'no_hours' }
  } catch (e) {
    console.error('sync error', loc.id, e)
    return { ...base, status: 'error', error: 'exception' }
  }
}

function summarize(outcomes: SyncOutcome[]) {
  const count = (s: SyncOutcome['status']) => outcomes.filter((o) => o.status === s).length
  return {
    total: outcomes.length,
    updated: count('updated'),
    no_hours: count('no_hours'),
    errors: outcomes.filter((o) => o.status === 'error'),
    skipped_budget: count('skipped_budget'),
  }
}

async function runBatch(admin: SupabaseClient) {
  const { data, error } = await admin
    .from('locations')
    .select('id, name, address, city, lat, lng, google_place_id, opening_hours_source')
    .not('google_place_id', 'is', null)
    // NULL ou 'google_auto' : un `neq` seul exclurait les NULL.
    .or('opening_hours_source.is.null,opening_hours_source.neq.manuel')
  if (error) throw new Error(`select failed: ${error.message}`)

  const budget = new CallBudget(MAX_GOOGLE_CALLS_PER_RUN)
  const outcomes = await mapPool(data as LocationRow[], CONCURRENCY, (loc) => syncOne(admin, loc, budget))
  const summary = summarize(outcomes)
  console.log('sync-opening-hours batch', JSON.stringify({ ...summary, google_calls: budget.used }))
  return summary
}

// ---------------------------------------------------------------------------
// Matching des place_id (match)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(['le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'et', 'a', 'au', 'aux', 'en', 'the'])

function nameTokens(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
}

// Part des mots du nom le plus court retrouvés dans l'autre (« Parc de Procé » ↔ « Parc de
// Procé Nantes » = 1). Tolère les suffixes de ville ou de catégorie ajoutés côté Google.
function nameScore(a: string, b: string): number {
  const ta = nameTokens(a)
  const tb = nameTokens(b)
  if (ta.length === 0 || tb.length === 0) return 0
  const [short, long] = ta.length <= tb.length ? [ta, new Set(tb)] : [tb, new Set(ta)]
  return short.filter((t) => long.has(t)).length / short.length
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

interface Candidate {
  place_id: string
  name: string
  address: string | null
  distance_m: number
  name_score: number
}

type MatchOutcome =
  | { id: string; name: string; status: 'matched'; place_id: string; candidate: Candidate }
  | { id: string; name: string; status: 'ambiguous' | 'none'; candidates: Candidate[] }
  | { id: string; name: string; status: 'error'; error: string; candidates?: Candidate[] }
  | { id: string; name: string; status: 'skipped_budget' }

async function matchOne(
  admin: SupabaseClient,
  loc: LocationRow,
  budget: CallBudget,
  dryRun: boolean,
): Promise<MatchOutcome> {
  const base = { id: loc.id, name: loc.name }
  if (!budget.take()) return { ...base, status: 'skipped_budget' }

  try {
    const textQuery = [loc.name, loc.address, loc.city].filter(Boolean).join(', ')
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY!,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'fr',
        regionCode: 'FR',
        pageSize: 3,
        locationBias: {
          circle: { center: { latitude: loc.lat, longitude: loc.lng }, radius: 1000 },
        },
      }),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      console.warn('text search failed', loc.id, res.status, detail)
      return { ...base, status: 'error', error: `google_${res.status}` }
    }
    const body = await res.json()
    const places: GooglePlace[] = Array.isArray(body?.places) ? body.places : []
    const candidates: Candidate[] = places
      .filter((p): p is GooglePlace & { id: string } => typeof p?.id === 'string')
      .map((p) => {
        const name = p.displayName?.text ?? ''
        const lat = p.location?.latitude
        const lng = p.location?.longitude
        return {
          place_id: p.id,
          name,
          address: p.formattedAddress ?? null,
          distance_m:
            typeof lat === 'number' && typeof lng === 'number'
              ? Math.round(distanceMeters(loc.lat, loc.lng, lat, lng))
              : Number.POSITIVE_INFINITY,
          name_score: Math.round(nameScore(loc.name, name) * 100) / 100,
        }
      })

    if (candidates.length === 0) return { ...base, status: 'none', candidates }

    const isSure = (c: Candidate) =>
      c.name_score >= MATCH_MIN_NAME_SCORE && c.distance_m <= MATCH_MAX_DISTANCE_M
    const sure = candidates.filter(isSure)
    // Deux candidats « sûrs » distincts = on ne sait pas lequel prendre.
    if (sure.length !== 1) return { ...base, status: 'ambiguous', candidates }

    const chosen = sure[0]
    if (!dryRun) {
      const { error } = await admin
        .from('locations')
        .update({ google_place_id: chosen.place_id })
        .eq('id', loc.id)
        .is('google_place_id', null)
      if (error) {
        // 23505 : ce place_id est déjà attribué à un autre lieu (doublon probable côté Kidmapp).
        const reason = error.code === '23505' ? 'place_id_already_used' : 'db_update_failed'
        console.warn('match update failed', loc.id, error.message)
        return { ...base, status: 'error', error: reason, candidates }
      }
    }
    return { ...base, status: 'matched', place_id: chosen.place_id, candidate: chosen }
  } catch (e) {
    console.error('match error', loc.id, e)
    return { ...base, status: 'error', error: 'exception' }
  }
}

async function runMatch(admin: SupabaseClient, dryRun: boolean) {
  const { data, error } = await admin
    .from('locations')
    .select('id, name, address, city, lat, lng, google_place_id, opening_hours_source')
    .is('google_place_id', null)
    .order('name')
  if (error) throw new Error(`select failed: ${error.message}`)

  const budget = new CallBudget(MAX_GOOGLE_CALLS_PER_RUN)
  const outcomes = await mapPool(data as LocationRow[], CONCURRENCY, (loc) =>
    matchOne(admin, loc, budget, dryRun),
  )
  const pick = (s: MatchOutcome['status']) => outcomes.filter((o) => o.status === s)
  const report = {
    dry_run: dryRun,
    total: outcomes.length,
    matched: pick('matched'),
    ambiguous: pick('ambiguous'),
    none: pick('none'),
    errors: pick('error'),
    skipped_budget: pick('skipped_budget').length,
    google_calls: budget.used,
  }
  console.log(
    'sync-opening-hours match',
    JSON.stringify({
      dry_run: dryRun,
      total: report.total,
      matched: report.matched.length,
      ambiguous: report.ambiguous.length,
      none: report.none.length,
      errors: report.errors.length,
      google_calls: budget.used,
    }),
  )
  return report
}

// ---------------------------------------------------------------------------

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    const isServiceRole = parseJwtRole(authHeader) === 'service_role'
    if (!isServiceRole && !(authHeader.startsWith('Bearer ') && (await isAdminCaller(admin, authHeader)))) {
      return json({ error: 'forbidden' }, 403)
    }

    if (!GOOGLE_KEY) {
      console.error('GOOGLE_PLACES_API_KEY missing')
      return json({ error: 'missing_google_key' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const mode: Mode = body?.mode
    if (mode !== 'batch' && mode !== 'single' && mode !== 'match') {
      return json({ error: 'invalid_mode' }, 400)
    }

    if (mode === 'batch') {
      // Le cron (pg_net) n'attend pas la réponse : on répond tout de suite et on travaille en
      // arrière-plan. Le résumé part dans les logs de la fonction.
      EdgeRuntime.waitUntil(runBatch(admin).catch((e) => console.error('batch background error', e)))
      return json({ ok: true, scheduled: true })
    }

    if (mode === 'match') {
      return json(await runMatch(admin, body?.dry_run === true))
    }

    // single
    const locationId = body?.location_id
    if (typeof locationId !== 'string' || locationId.length === 0) {
      return json({ error: 'missing_location_id' }, 400)
    }
    const { data: loc, error } = await admin
      .from('locations')
      .select('id, name, address, city, lat, lng, google_place_id, opening_hours_source')
      .eq('id', locationId)
      .maybeSingle()
    if (error) throw new Error(`select failed: ${error.message}`)
    if (!loc) return json({ error: 'location_not_found' }, 404)

    const outcome = await syncOne(admin, loc as LocationRow, new CallBudget(1))
    return json(outcome, outcome.status === 'error' ? 422 : 200)
  } catch (e) {
    console.error('sync-opening-hours error', e)
    return json({ error: 'internal_error' }, 500)
  }
})
