import { describe, it, expect } from 'vitest';
import {
  notifiedIdsByUser,
  withoutAlreadyNotified,
} from '../../supabase/functions/_shared/digest/dedupe.ts';

// Régression : la fenêtre de lookback de `new-location-alert` (48 h) est deux
// fois plus large que l'intervalle de son cron (24 h). Chaque lieu publié est
// donc remonté par DEUX runs consécutifs, et la contrainte unique
// (user_id, send_date) ne borne qu'un mail par jour — pas le contenu de ce
// mail. Sans dédoublonnage, le parent recevait deux fois la même liste.

const PARENT = 'parent-1';
const AUTRE_PARENT = 'parent-2';

/** Les 4 lieux nantais publiés le 10 septembre 2026, remontés par le lookback. */
const lieuxRecents = [
  { id: 'laep' },
  { id: 'librairie-machines' },
  { id: 'librairie-hab' },
  { id: 'malo-jeux' },
];

describe('dédoublonnage des alertes nouveau lieu', () => {
  it('envoie la liste complète au premier run', () => {
    const dejaVus = notifiedIdsByUser([]);
    expect(withoutAlreadyNotified(lieuxRecents, dejaVus.get(PARENT))).toHaveLength(4);
  });

  it("n'envoie rien au run du lendemain, sur les mêmes lieux", () => {
    const envoiDeLaVeille = lieuxRecents.map((l) => l.id);
    const dejaVus = notifiedIdsByUser([{ user_id: PARENT, location_ids: envoiDeLaVeille }]);

    expect(withoutAlreadyNotified(lieuxRecents, dejaVus.get(PARENT))).toEqual([]);
  });

  it('ne garde que le lieu publié depuis le dernier envoi', () => {
    const dejaVus = notifiedIdsByUser([
      { user_id: PARENT, location_ids: ['laep', 'librairie-machines'] },
    ]);

    const aEnvoyer = withoutAlreadyNotified(lieuxRecents, dejaVus.get(PARENT));
    expect(aEnvoyer.map((l) => l.id)).toEqual(['librairie-hab', 'malo-jeux']);
  });

  it("cumule plusieurs envois du même parent sur la fenêtre lue", () => {
    const dejaVus = notifiedIdsByUser([
      { user_id: PARENT, location_ids: ['laep'] },
      { user_id: PARENT, location_ids: ['librairie-hab'] },
    ]);

    expect(withoutAlreadyNotified(lieuxRecents, dejaVus.get(PARENT)).map((l) => l.id)).toEqual([
      'librairie-machines',
      'malo-jeux',
    ]);
  });

  it("n'applique jamais l'historique d'un parent à un autre", () => {
    const dejaVus = notifiedIdsByUser([{ user_id: AUTRE_PARENT, location_ids: ['laep'] }]);

    expect(withoutAlreadyNotified(lieuxRecents, dejaVus.get(PARENT))).toHaveLength(4);
  });

  it('tolère une colonne location_ids vide ou nulle', () => {
    const dejaVus = notifiedIdsByUser([
      { user_id: PARENT, location_ids: null },
      { user_id: PARENT, location_ids: [] },
    ]);

    expect(withoutAlreadyNotified(lieuxRecents, dejaVus.get(PARENT))).toHaveLength(4);
  });
});
