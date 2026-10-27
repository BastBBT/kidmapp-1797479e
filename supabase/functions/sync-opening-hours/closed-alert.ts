export interface ClosedLocation { id: string; name: string; city: string | null }

// Lieux à signaler aux admins : publiés, que Google déclare désormais fermés définitivement et qui
// ne l'étaient pas avant cette synchro. La transition évite de renvoyer le même mail chaque mois
// tant qu'un admin n'a pas désactivé le lieu. Un lieu absent de `previousStatus` (sans Place ID au
// début du batch) n'a pas été synchronisé : il n'a pas pu « devenir » fermé, on ne le signale pas.
export function newlyClosedPermanently(
  previousStatus: Map<string, string | null>,
  nowClosedPublished: ClosedLocation[],
): ClosedLocation[] {
  return nowClosedPublished.filter(
    (l) => previousStatus.has(l.id) && previousStatus.get(l.id) !== 'CLOSED_PERMANENTLY',
  )
}
