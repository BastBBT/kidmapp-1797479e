/**
 * Personnalisation de la sélection hebdo : jours dispo, vacances scolaires,
 * types de sorties / de lieux (colonnes `profiles.digest_days`,
 * `digest_holidays_all_week`, `digest_event_categories`,
 * `alert_location_categories`, table `school_holidays`).
 *
 * Fonctions pures, sans dépendance Deno/npm — testables avec vitest comme
 * `dedupe.ts`. Toutes les dates sont des chaînes ISO `YYYY-MM-DD` lues en UTC,
 * même convention que le reste de `weekly-digest`.
 */

export type DigestDays = 'weekend' | 'wed_weekend' | 'all'

export interface SchoolHoliday {
  label: string
  /** Premier jour sans école, inclus. */
  first_day: string
  /** Dernier jour sans école, inclus (la reprise est le lendemain). */
  last_day: string
}

export interface DigestPrefs {
  digestDays: DigestDays
  holidaysAllWeek: boolean
  /** null = toutes les catégories (défaut, comportement d'avant la feature). */
  eventCategories: string[] | null
}

export interface DatedOccurrence {
  date_start: string
  date_end: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Une valeur inconnue en base (ne devrait pas arriver, CHECK) retombe sur
 * « tous les jours » : on n'appauvrit jamais une sélection sur une donnée
 * qu'on ne sait pas lire. */
export function parseDigestDays(value: string | null | undefined): DigestDays {
  return value === 'weekend' || value === 'wed_weekend' ? value : 'all'
}

/** Tableau vide ou null = tout accepter (la contrainte interdit le vide, mais
 * on ne filtre jamais tout sur une donnée inattendue). */
export function categoryAllowed(category: string | null | undefined, allowed: string[] | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true
  return !!category && allowed.includes(category)
}

/** 0 = dimanche … 6 = samedi (convention EXTRACT(DOW), comme `digest_day`). */
export function dowOfISO(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCDay()
}

export function isWeekendISO(iso: string): boolean {
  const dow = dowOfISO(iso)
  return dow === 0 || dow === 6
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + days * DAY_MS).toISOString().slice(0, 10)
}

export function holidayOn(iso: string, holidays: SchoolHoliday[]): SchoolHoliday | null {
  return holidays.find((h) => h.first_day <= iso && iso <= h.last_day) ?? null
}

/** Les jours [start, endExclusive) sous forme ISO. */
export function daysInWindow(start: string, endExclusive: string): string[] {
  const out: string[] = []
  for (let d = start; d < endExclusive; d = addDays(d, 1)) out.push(d)
  return out
}

export function isDayWanted(iso: string, prefs: DigestPrefs, holidays: SchoolHoliday[]): boolean {
  if (prefs.digestDays === 'all') return true
  if (prefs.holidaysAllWeek && holidayOn(iso, holidays)) return true
  const dow = dowOfISO(iso)
  if (dow === 0 || dow === 6) return true
  return prefs.digestDays === 'wed_weekend' && dow === 3
}

/**
 * Jours de la fenêtre où l'occurrence a lieu ET que le parent veut. Une expo
 * qui court toute la semaine garde ainsi ses jours de week-end : elle reste
 * dans la sélection d'un parent « week-end seulement ».
 */
export function wantedDaysOf(
  occ: DatedOccurrence,
  windowDays: string[],
  prefs: DigestPrefs,
  holidays: SchoolHoliday[],
): string[] {
  const end = occ.date_end && occ.date_end > occ.date_start ? occ.date_end : occ.date_start
  return windowDays.filter((d) => occ.date_start <= d && d <= end && isDayWanted(d, prefs, holidays))
}

/** Vacances qui touchent la fenêtre — la première suffit à l'affichage. */
export function holidayInWindow(windowDays: string[], holidays: SchoolHoliday[]): SchoolHoliday | null {
  for (const d of windowDays) {
    const h = holidayOn(d, holidays)
    if (h) return h
  }
  return null
}

/**
 * Forme du mail de la semaine :
 * - `weekend` : seuls des jours de week-end sont voulus dans la fenêtre
 *   (parent « week-end » hors vacances) ;
 * - `holidays` : des vacances touchent la fenêtre et le parent reçoit toute
 *   la semaine pendant ce temps ;
 * - `week` : tout le reste (comportement d'avant la feature).
 */
export type DigestMode = 'weekend' | 'holidays' | 'week'

export function digestMode(windowDays: string[], prefs: DigestPrefs, holidays: SchoolHoliday[]): DigestMode {
  const wanted = windowDays.filter((d) => isDayWanted(d, prefs, holidays))
  if (wanted.length > 0 && wanted.every(isWeekendISO)) return 'weekend'
  if (holidayInWindow(windowDays, holidays) && (prefs.digestDays === 'all' || prefs.holidaysAllWeek)) return 'holidays'
  return 'week'
}

export interface GroupableItem {
  /** Jours voulus de l'occurrence dans la fenêtre (cf. `wantedDaysOf`), triés. */
  wantedDays: string[]
}

export interface ItemGroup<T> {
  /** Clé stable — le libellé est composé par le gabarit (langue, format). */
  kind: 'day' | 'whole_weekend' | 'this_weekend' | 'rest_of_week'
  /** Jour concerné pour `day`, ou jour unique du groupe `rest_of_week`. */
  day: string | null
  items: T[]
}

/**
 * Regroupe les sorties pour le mail, week-end toujours en tête.
 * - mode `weekend` : un groupe par jour (samedi, dimanche), puis « tout le
 *   week-end » pour ce qui couvre les deux jours (expo, festival) ;
 * - sinon : « ce week-end » puis « le reste de la semaine » (qui porte son
 *   jour quand il n'y en a qu'un, ex. le mercredi d'un parent « mercredi +
 *   week-end »).
 */
export function groupItems<T extends GroupableItem>(items: T[], mode: DigestMode): ItemGroup<T>[] {
  if (mode === 'weekend') {
    const byDay = new Map<string, T[]>()
    const whole: T[] = []
    for (const it of items) {
      const weekendDays = it.wantedDays.filter(isWeekendISO)
      if (weekendDays.length >= 2) {
        whole.push(it)
      } else if (weekendDays.length === 1) {
        const list = byDay.get(weekendDays[0]) ?? []
        list.push(it)
        byDay.set(weekendDays[0], list)
      }
    }
    const groups: ItemGroup<T>[] = Array.from(byDay.keys())
      .sort()
      .map((day) => ({ kind: 'day' as const, day, items: byDay.get(day)! }))
    if (whole.length > 0) groups.push({ kind: 'whole_weekend', day: null, items: whole })
    return groups
  }

  const weekend = items.filter((it) => it.wantedDays.some(isWeekendISO))
  const rest = items.filter((it) => !it.wantedDays.some(isWeekendISO))
  const groups: ItemGroup<T>[] = []
  if (weekend.length > 0) groups.push({ kind: 'this_weekend', day: null, items: weekend })
  if (rest.length > 0) {
    // Titré par son jour seulement si TOUS les jours de TOUS ses items sont ce
    // jour-là : une expo du jeudi au mardi ne doit pas s'afficher sous « Jeudi ».
    const restDays = new Set(rest.flatMap((it) => it.wantedDays))
    groups.push({ kind: 'rest_of_week', day: restDays.size === 1 ? rest[0].wantedDays[0] : null, items: rest })
  }
  return groups
}

/**
 * Plafonne le nombre d'items affichés en gardant l'ordre des groupes (le
 * week-end passe donc en premier). Les groupes vidés disparaissent ; le total
 * reste disponible pour le « voir les N idées ».
 */
export function capGroups<T>(groups: ItemGroup<T>[], max: number): ItemGroup<T>[] {
  let left = max
  const out: ItemGroup<T>[] = []
  for (const g of groups) {
    if (left <= 0) break
    const items = g.items.slice(0, left)
    left -= items.length
    out.push({ ...g, items })
  }
  return out
}
