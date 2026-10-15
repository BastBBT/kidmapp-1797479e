import { describe, it, expect } from 'vitest';
import {
  emptySlotDraft,
  nextSlotDraft,
  preparedSlots,
  slotRangeError,
  slotsAreValid,
} from '@/lib/eventSlots';

const slot = (date_start: string, date_end = '', time = '') => ({ date_start, date_end, time });

describe('nextSlotDraft', () => {
  it('tombe le lendemain et reprend l’heure', () => {
    expect(nextSlotDraft(slot('2026-10-28', '', '14:00'))).toEqual(slot('2026-10-29', '', '14:00'));
  });
  it('part de la fin quand le créneau précédent est une plage', () => {
    expect(nextSlotDraft(slot('2026-10-28', '2026-10-30'))).toEqual(slot('2026-10-31'));
  });
  it('passe le changement de mois et d’année', () => {
    expect(nextSlotDraft(slot('2026-10-31')).date_start).toBe('2026-11-01');
    expect(nextSlotDraft(slot('2026-12-31')).date_start).toBe('2027-01-01');
  });
  it('reste vide quand le précédent n’a pas de date', () => {
    expect(nextSlotDraft(emptySlotDraft()).date_start).toBe('');
  });
});

describe('slotRangeError / slotsAreValid', () => {
  it('refuse une fin avant le début', () => {
    expect(slotRangeError(slot('2026-10-28', '2026-10-27'))).toBe(true);
    expect(slotRangeError(slot('2026-10-28', '2026-10-28'))).toBe(false);
    expect(slotRangeError(slot('2026-10-28'))).toBe(false);
  });
  it('exige au moins un créneau daté', () => {
    expect(slotsAreValid([emptySlotDraft()])).toBe(false);
    expect(slotsAreValid([slot('2026-10-28')])).toBe(true);
  });
  it('ignore une ligne vide ajoutée par erreur mais bloque une plage inversée', () => {
    expect(slotsAreValid([slot('2026-10-28'), emptySlotDraft()])).toBe(true);
    expect(slotsAreValid([slot('2026-10-28'), slot('2026-10-30', '2026-10-29')])).toBe(false);
  });
});

describe('preparedSlots', () => {
  it('écarte les lignes vides et convertit les champs vides en null', () => {
    expect(preparedSlots([emptySlotDraft(), slot('2026-10-28')])).toEqual([
      { date_start: '2026-10-28', date_end: null, time: null },
    ]);
  });
  it('trie par date puis heure, sans heure en dernier', () => {
    const rows = preparedSlots([
      slot('2026-10-30', '', '10:00'),
      slot('2026-10-28'),
      slot('2026-10-28', '', '15:00'),
      slot('2026-10-28', '', '09:30'),
    ]);
    expect(rows.map((r) => `${r.date_start} ${r.time ?? '-'}`)).toEqual([
      '2026-10-28 09:30',
      '2026-10-28 15:00',
      '2026-10-28 -',
      '2026-10-30 10:00',
    ]);
  });
  it('retire les doublons exacts', () => {
    expect(preparedSlots([slot('2026-10-28', '', '14:00'), slot('2026-10-28', '', '14:00')])).toHaveLength(1);
  });
  it('garde deux créneaux le même jour à des heures différentes', () => {
    expect(preparedSlots([slot('2026-10-28', '', '10:00'), slot('2026-10-28', '', '15:00')])).toHaveLength(2);
  });
});
