export interface ClosedLocation { name: string; city: string | null }

interface Candidate extends ClosedLocation { id: string }

// Lieux à signaler aux admins : publiés, que Google déclare désormais fermés définitivement et qui
// ne l'étaient pas avant cette synchro. La transition évite de renvoyer le même mail chaque mois
// tant qu'un admin n'a pas désactivé le lieu.
export function newlyClosedPermanently(
  previousStatus: Map<string, string | null>,
  nowClosedPublished: Candidate[],
): ClosedLocation[] {
  return nowClosedPublished
    .filter((l) => previousStatus.get(l.id) !== 'CLOSED_PERMANENTLY')
    .map(({ name, city }) => ({ name, city }))
}
