// Calculs du rapport hebdo admin, sans I/O : les lignes sont déjà lues et filtrées (admins et
// compte de test exclus). Séparé de l'edge function pour être testé.

export const PLATFORM_KEYS = ['web', 'ios', 'android'] as const
export type PlatformKey = (typeof PLATFORM_KEYS)[number]

export interface ViewRow {
  user_id: string | null
  created_at: string
  platform: string
  session_id: string | null
  device_id: string | null
  path: string
}

export type PlatformCounts = Record<PlatformKey, number>

const emptyCounts = (): PlatformCounts => ({ web: 0, ios: 0, android: 0 })
const isPlatform = (p: string): p is PlatformKey => (PLATFORM_KEYS as readonly string[]).includes(p)

const EVENT_PATH = /^\/event\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** Identifiant de la sortie visée par un chemin `/event/<uuid>`, en minuscules ; sinon null. */
export function eventIdOf(path: string): string | null {
  const m = EVENT_PATH.exec(path)
  return m ? m[1].toLowerCase() : null
}

/** Jour de semaine UTC, lundi = 0 … dimanche = 6 (même découpage que le dashboard). */
export function dayIndex(iso: string): number {
  return (new Date(iso).getUTCDay() + 6) % 7
}

/** Écart en % arrondi ; null quand la période de comparaison est vide (rien à comparer). */
export function deltaPct(cur: number, prev: number): number | null {
  return prev === 0 ? null : Math.round(((cur - prev) / prev) * 100)
}

/** Sessions distinctes par plateforme, comme `admin_audience_stats` (les lignes sans session_id ne comptent pas). */
export function sessionsByPlatform(rows: ViewRow[]): PlatformCounts {
  const seen: Record<PlatformKey, Set<string>> = { web: new Set(), ios: new Set(), android: new Set() }
  for (const r of rows) {
    if (r.session_id && isPlatform(r.platform)) seen[r.platform].add(r.session_id)
  }
  return { web: seen.web.size, ios: seen.ios.size, android: seen.android.size }
}

/** Sessions distinctes par jour (lundi → dimanche) et par plateforme ; une session à cheval sur minuit compte deux fois, comme dans le dashboard. */
export function dailySessions(rows: ViewRow[]): PlatformCounts[] {
  const seen = Array.from({ length: 7 }, () => ({
    web: new Set<string>(),
    ios: new Set<string>(),
    android: new Set<string>(),
  }))
  for (const r of rows) {
    if (r.session_id && isPlatform(r.platform)) seen[dayIndex(r.created_at)][r.platform].add(r.session_id)
  }
  return seen.map((d) => ({ web: d.web.size, ios: d.ios.size, android: d.android.size }))
}

export interface TopEvent {
  id: string
  views: number
  deltaPct: number | null
}

export interface EventStats {
  views: number
  viewsPrev: number
  visitors: number
  /** Part des visiteurs de la semaine déjà venus voir une sortie la semaine d'avant ; null si rien à comparer. */
  returningPct: number | null
  top: TopEvent[]
}

const visitorKey = (r: ViewRow) => r.device_id ?? r.user_id

/** Fiches de sorties ouvertes cette semaine (A) vs la précédente (B), visiteurs distincts et retour. */
export function eventStats(rowsA: ViewRow[], rowsB: ViewRow[], topSize = 5): EventStats {
  const countA = new Map<string, number>()
  const countB = new Map<string, number>()
  const visitorsA = new Set<string>()
  const visitorsB = new Set<string>()
  let views = 0
  let viewsPrev = 0

  for (const r of rowsA) {
    const id = eventIdOf(r.path)
    if (!id) continue
    views++
    countA.set(id, (countA.get(id) ?? 0) + 1)
    const k = visitorKey(r)
    if (k) visitorsA.add(k)
  }
  for (const r of rowsB) {
    const id = eventIdOf(r.path)
    if (!id) continue
    viewsPrev++
    countB.set(id, (countB.get(id) ?? 0) + 1)
    const k = visitorKey(r)
    if (k) visitorsB.add(k)
  }

  let returning = 0
  for (const k of visitorsA) if (visitorsB.has(k)) returning++
  const returningPct =
    visitorsA.size === 0 || visitorsB.size === 0 ? null : Math.round((returning / visitorsA.size) * 100)

  const top = [...countA.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topSize)
    .map(([id, n]) => ({ id, views: n, deltaPct: deltaPct(n, countB.get(id) ?? 0) }))

  return { views, viewsPrev, visitors: visitorsA.size, returningPct, top }
}

/**
 * Hauteurs en pixels d'une barre empilée dans une zone de `area` px dont le plein vaut `max`.
 * La somme `empty + segs` vaut toujours `area` ; un segment arrondi à 0 px disparaît.
 */
export function stackHeights(counts: number[], max: number, area: number): { empty: number; segs: number[] } {
  const sum = counts.reduce((a, b) => a + b, 0)
  if (sum <= 0 || max <= 0) return { empty: area, segs: counts.map(() => 0) }
  const total = Math.min(area, Math.max(1, Math.round((sum / max) * area)))
  const raw = counts.map((c) => (c / sum) * total)
  const segs = raw.map(Math.floor)
  let left = total - segs.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (left <= 0) break
    if (counts[i] > 0) {
      segs[i]++
      left--
    }
  }
  return { empty: area - total, segs }
}
