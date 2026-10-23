import { useEffect, useState } from 'react';

/**
 * Filtre « Doublons possibles » de l'onglet Propositions de l'admin.
 *
 * Le bouton qui l'active n'est affiché que quand il existe au moins une proposition signalée. Si la
 * dernière est publiée ou refusée pendant que le filtre est actif, le bouton se retire : le filtre
 * doit se couper avec lui, sinon la liste reste vide et plus rien ne permet de le rouvrir sans
 * quitter l'onglet.
 */
export function useDuplicatesFilter(duplicateCount: number) {
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);

  useEffect(() => {
    if (duplicateCount === 0) setDuplicatesOnly(false);
  }, [duplicateCount]);

  return {
    duplicatesOnly,
    toggleDuplicatesOnly: () => setDuplicatesOnly((v) => !v),
  };
}
