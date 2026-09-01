import { describe, it, expect } from 'vitest';
import { ageRangeError, monthsPairToDraft, convertAgeDraftValue } from '@/lib/ageFormat';

describe('monthsPairToDraft → ageRangeError, le trajet complet du formulaire admin', () => {
  it("rend éditable une fiche « de 1 an à 5 ans »", () => {
    // Régression du 2026-09-01 : 12 mois n'était pas reconnu comme une année
    // pleine (seuil `>= 24`), la fiche s'ouvrait en mois, et le plafond de
    // 36 mois refusait ensuite le 60 que le formulaire venait d'afficher —
    // impossible d'enregistrer ni d'approuver sans vider l'âge.
    const draft = monthsPairToDraft(12, 60);
    expect(draft).toEqual({ minValue: '1', maxValue: '5', unit: 'years' });
    expect(ageRangeError(draft.minValue, draft.maxValue, draft.unit)).toBeNull();
  });

  it('garde les mois quand la borne ne tombe pas sur une année pleine, et les accepte', () => {
    const draft = monthsPairToDraft(18, 60);
    expect(draft).toEqual({ minValue: '18', maxValue: '60', unit: 'months' });
    expect(ageRangeError(draft.minValue, draft.maxValue, draft.unit)).toBeNull();
  });

  it('ouvre en ans une plage classique et une fiche sans âge', () => {
    expect(monthsPairToDraft(36, 72).unit).toBe('years');
    expect(monthsPairToDraft(null, null)).toEqual({ minValue: '', maxValue: '', unit: 'years' });
  });

  it("n'invente pas de borne quand une seule est définie", () => {
    expect(monthsPairToDraft(24, null)).toEqual({ minValue: '2', maxValue: '', unit: 'years' });
    expect(monthsPairToDraft(null, 18)).toEqual({ minValue: '', maxValue: '18', unit: 'months' });
  });
});

describe('ageRangeError', () => {
  it('accepte un âge en mois au-delà de trois ans', () => {
    // 60 mois = 5 ans : dire la même chose dans l'autre unité n'est pas une erreur.
    expect(ageRangeError('12', '60', 'months')).toBeNull();
  });

  it('borne les deux unités à la même limite réelle', () => {
    expect(ageRangeError('', '99', 'years')).toBeNull();
    expect(ageRangeError('', '100', 'years')).toBe('Âge entre 0 et 99 ans');
    expect(ageRangeError('', '1188', 'months')).toBeNull();
    expect(ageRangeError('', '1189', 'months')).toBe('Âge entre 0 et 1188 mois (99 ans)');
  });

  it('laisse passer les champs vides — l’âge conseillé est optionnel', () => {
    expect(ageRangeError('', '', 'years')).toBeNull();
  });

  it('refuse une saisie non numérique, un négatif, et un max sous le min', () => {
    expect(ageRangeError('abc', '', 'years')).toBe('Âge invalide');
    expect(ageRangeError('-1', '', 'years')).toBe('Âge entre 0 et 99 ans');
    expect(ageRangeError('5', '3', 'years')).toBe("L'âge max doit être ≥ l'âge min");
  });
});

describe('convertAgeDraftValue', () => {
  it('convertit la valeur au changement d’unité au lieu de la réinterpréter', () => {
    expect(convertAgeDraftValue('5', 'years', 'months')).toBe('60');
    expect(convertAgeDraftValue('60', 'months', 'years')).toBe('5');
    expect(convertAgeDraftValue('', 'years', 'months')).toBe('');
  });
});
