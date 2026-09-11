/**
 * Dédoublonnage des alertes « nouveau lieu ».
 *
 * Le lookback de `new-location-alert` (48 h) est volontairement plus large que
 * l'intervalle de son cron (24 h) : c'est le filet qui rattrape un run manqué.
 * La contrepartie, c'est que chaque lieu publié apparaît dans DEUX runs
 * consécutifs. La contrainte d'unicité `(user_id, send_date)` ne l'empêche pas
 * — elle borne à un mail par parent et par jour, pas à un lieu par parent.
 * Sans le filtre ci-dessous, tout lieu publié partait donc deux jours de
 * suite, à l'identique (défaut trouvé en relisant la chaîne le 2026-09-11,
 * avant la mise en service du cron).
 */

export interface PreviousSendRow {
  user_id: string
  location_ids: string[] | null
}

/** Regroupe par parent les identifiants déjà annoncés sur la fenêtre lue. */
export function notifiedIdsByUser(rows: PreviousSendRow[]): Map<string, Set<string>> {
  const byUser = new Map<string, Set<string>>()
  for (const row of rows) {
    const known = byUser.get(row.user_id) ?? new Set<string>()
    for (const id of row.location_ids ?? []) known.add(id)
    byUser.set(row.user_id, known)
  }
  return byUser
}

/** Retire d'une sélection les lieux déjà annoncés à ce parent. */
export function withoutAlreadyNotified<T extends { id: string }>(
  items: T[],
  notified: Set<string> | undefined,
): T[] {
  if (!notified || notified.size === 0) return items
  return items.filter((item) => !notified.has(item.id))
}
