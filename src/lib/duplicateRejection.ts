import type { DuplicateMatch } from '@/lib/duplicateLocation';

const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Motif de refus proposé quand une proposition fait doublon : le même dialogue de refus que d'habitude,
 * juste pré-rempli (et modifiable) avec le lieu déjà en base et son lien. Les noms sont plafonnés pour
 * que le motif reste sous la limite de 1000 caractères du dialogue.
 */
export function duplicateRejectMessage(proposalName: string, match: DuplicateMatch): string {
  const existing = match.candidate;
  const name = proposalName.trim();
  const sameName = name.toLowerCase() === existing.name.trim().toLowerCase();
  const nameBit = sameName ? '' : ` (« ${clip(existing.name.trim(), 120)} »)`;
  return (
    `Merci pour ta proposition ! « ${clip(name, 120)} » est déjà dans Kidmapp${nameBit}, on ne peut donc pas l'ajouter une deuxième fois. ` +
    `Tu peux le retrouver ici : https://kidmapp.app/location/${existing.id}\n` +
    `N'hésite pas à nous proposer d'autres adresses !`
  );
}

/**
 * Motif à pré-remplir pour une proposition en doublon, ou « » si rien ne le justifie. Un nom proche à une
 * autre adresse est souvent une autre enseigne de la même chaîne : pré-remplir un refus « déjà dans
 * Kidmapp » serait alors faux et partirait en un clic.
 */
export function suggestedRejectReason(proposalName: string, matches: DuplicateMatch[] | undefined): string {
  const first = matches?.[0];
  if (!first || (first.level !== 'strong' && !first.sameAddress)) return '';
  return duplicateRejectMessage(proposalName, first);
}
