// Surveillance des routines de collecte d'events (repo kidmapp-automation).
// Chaque run termine en écrivant une ligne dans `sourcing_runs` (ÉTAPE 7 du playbook). Un run qui
// n'a pas tourné, qui a planté avant la fin ou dont la connexion du bot a échoué n'écrit rien, ou
// écrit `error` : c'est ce que ce module repère, pour qu'un mail parte le jour même au lieu de
// découvrir une semaine vide dans l'app.
//
// Logique pure (pas d'accès réseau) : testée dans src/test/sourcingWatchdog.test.ts.

export type Routine = 'weekly' | 'weekend'

export interface SourcingRun {
  routine: string
  status: string // 'ok' | 'partial' | 'error'
  started_at: string // ISO
  inserted: number | null
  error: string | null
}

export type Verdict =
  | { routine: Routine; scheduledAt: string; problem: 'missing' }
  | { routine: Routine; scheduledAt: string; problem: 'error' | 'partial' | 'empty'; detail: string | null }

// Horaires des crons des routines cloud, en UTC (README du repo kidmapp-automation).
// `weekday` : 0 = dimanche … 6 = samedi.
export const SCHEDULES: Record<Routine, { weekday: number; hourUtc: number; label: string }> = {
  weekly: { weekday: 1, hourUtc: 7, label: 'Collecte du lundi (kidmapp-weekly-events)' },
  weekend: { weekday: 4, hourUtc: 11, label: 'Rattrapage du jeudi (kidmapp-weekend-catchup)' },
}

// Temps laissé au run pour finir avant qu'on juge son absence.
export const GRACE_HOURS = 4
// Le watchdog tourne une fois par jour : il juge les runs prévus dans les 24 h qui précèdent
// `now - GRACE`. Chaque run prévu est ainsi jugé une fois, et une seule.
const CHECK_SPAN_HOURS = 24
// Un run lancé à la main un peu avant l'heure prévue compte.
const EARLY_TOLERANCE_HOURS = 24

const HOUR = 3600_000

/** Dernière occurrence prévue de la routine, au plus tard à `before`. */
export function lastScheduled(routine: Routine, before: Date): Date {
  const { weekday, hourUtc } = SCHEDULES[routine]
  const d = new Date(Date.UTC(before.getUTCFullYear(), before.getUTCMonth(), before.getUTCDate(), hourUtc))
  const back = (d.getUTCDay() - weekday + 7) % 7
  d.setUTCDate(d.getUTCDate() - back)
  if (d.getTime() > before.getTime()) d.setUTCDate(d.getUTCDate() - 7)
  return d
}

/** Problèmes des runs prévus dans la tranche jugée par l'appel à `now`. Vide = rien à signaler. */
export function checkRuns(now: Date, runs: SourcingRun[]): Verdict[] {
  const cutoff = new Date(now.getTime() - GRACE_HOURS * HOUR)
  const verdicts: Verdict[] = []
  for (const routine of Object.keys(SCHEDULES) as Routine[]) {
    const scheduled = lastScheduled(routine, cutoff)
    if (scheduled.getTime() <= cutoff.getTime() - CHECK_SPAN_HOURS * HOUR) continue
    const scheduledAt = scheduled.toISOString()

    const from = scheduled.getTime() - EARLY_TOLERANCE_HOURS * HOUR
    const mine = runs
      .filter((r) => r.routine === routine)
      .filter((r) => {
        const t = Date.parse(r.started_at)
        return t >= from && t <= now.getTime()
      })
      .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))

    // Plusieurs runs (relance à la main après un échec) : un seul run réussi suffit.
    const good = mine.find((r) => r.status === 'ok')
    if (good) {
      // Le lundi insère toujours plusieurs dizaines d'events : zéro trahit une collecte cassée.
      // Le jeudi, zéro est un résultat normal (tout le week-end est déjà en base).
      if (routine === 'weekly' && (good.inserted ?? 0) === 0) {
        verdicts.push({ routine, scheduledAt, problem: 'empty', detail: null })
      }
      continue
    }
    const latest = mine[0]
    if (!latest) {
      verdicts.push({ routine, scheduledAt, problem: 'missing' })
    } else {
      verdicts.push({
        routine,
        scheduledAt,
        problem: latest.status === 'partial' ? 'partial' : 'error',
        detail: latest.error,
      })
    }
  }
  return verdicts
}
