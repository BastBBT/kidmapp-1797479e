import type { DuplicateMatch } from '@/lib/duplicateLocation';

/**
 * Motif de refus proposé quand une proposition fait doublon : le même dialogue de refus que d'habitude,
 * juste pré-rempli (et modifiable) avec le lieu déjà en base et son lien.
 */
export function duplicateRejectMessage(proposalName: string, match: DuplicateMatch): string {
  const existing = match.candidate;
  const sameName = proposalName.trim().toLowerCase() === existing.name.trim().toLowerCase();
  const nameBit = sameName ? '' : ` (« ${existing.name} »)`;
  return (
    `Merci pour ta proposition ! « ${proposalName.trim()} » est déjà dans Kidmapp${nameBit}, on ne peut donc pas l'ajouter une deuxième fois. ` +
    `Tu peux le retrouver ici : https://kidmapp.app/location/${existing.id}\n` +
    `N'hésite pas à nous proposer d'autres adresses !`
  );
}
