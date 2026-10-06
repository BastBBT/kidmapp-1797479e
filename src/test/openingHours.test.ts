import { describe, expect, it } from 'vitest';
import {
  openStatus,
  parseOpeningHours,
  rangesForDay,
  todayInParis,
  dayName,
  type OpeningHours,
} from '@/lib/openingHours';
import { draftToHours, hoursToDraft } from '@/lib/openingHoursDraft';

const p = (day: number, oh: number, om: number, cday: number, ch: number, cm: number) => ({
  open: { day, hour: oh, minute: om },
  close: { day: cday, hour: ch, minute: cm },
});

// Mardi : 9:30-12:30 et 14:00-18:00 ; lundi fermé ; samedi 22:00 → dimanche 2:00.
const hours: OpeningHours = {
  periods: [p(2, 9, 30, 2, 12, 30), p(2, 14, 0, 2, 18, 0), p(3, 9, 30, 3, 18, 0), p(6, 22, 0, 0, 2, 0)],
};

// 2026-10-06 est un mardi ; Paris est en UTC+2 en octobre.
const paris = (iso: string) => new Date(`${iso}+02:00`);

describe('parseOpeningHours', () => {
  it('rejette les valeurs absentes ou malformées', () => {
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours({})).toBeNull();
    expect(parseOpeningHours({ periods: [] })).toBeNull();
    expect(parseOpeningHours({ periods: [{ open: { day: 9, hour: 1, minute: 0 } }] })).toBeNull();
  });
  it('garde les périodes valides', () => {
    expect(parseOpeningHours(hours)?.periods).toHaveLength(4);
  });
});

describe('openStatus', () => {
  it('ouvert le matin, ferme à 12:30 le jour même', () => {
    const s = openStatus(hours, paris('2026-10-06T10:00:00'));
    expect(s).toEqual({ kind: 'open', closesAt: { day: 2, hour: 12, minute: 30 }, closesInDays: 0 });
  });

  it('fermé à la pause de midi, rouvre à 14:00', () => {
    const s = openStatus(hours, paris('2026-10-06T13:00:00'));
    expect(s).toEqual({ kind: 'closed', opensAt: { day: 2, hour: 14, minute: 0 }, opensInDays: 0 });
  });

  it('fermé le soir, rouvre demain', () => {
    expect(openStatus(hours, paris('2026-10-06T19:00:00'))).toMatchObject({ kind: 'closed', opensInDays: 1 });
  });

  it('fermé le jeudi, rouvre samedi soir', () => {
    expect(openStatus(hours, paris('2026-10-08T12:00:00'))).toEqual({
      kind: 'closed', opensAt: { day: 6, hour: 22, minute: 0 }, opensInDays: 2,
    });
  });

  it('période qui chevauche la fin de semaine (samedi → dimanche)', () => {
    const sat = openStatus(hours, paris('2026-10-10T23:00:00'));
    expect(sat).toEqual({ kind: 'open', closesAt: { day: 0, hour: 2, minute: 0 }, closesInDays: 1 });
    const sun = openStatus(hours, paris('2026-10-11T01:00:00'));
    expect(sun).toMatchObject({ kind: 'open', closesInDays: 0 });
    expect(openStatus(hours, paris('2026-10-11T03:00:00')).kind).toBe('closed');
  });

  it("calcule à l'heure de Paris quel que soit le fuseau de l'appareil", () => {
    // 07:45 UTC = 09:45 à Paris → ouvert.
    expect(openStatus(hours, new Date('2026-10-06T07:45:00Z')).kind).toBe('open');
    expect(todayInParis(new Date('2026-10-05T22:30:00Z'))).toBe(2);
  });

  it('ouvert 24h/24', () => {
    expect(openStatus({ periods: [{ open: { day: 0, hour: 0, minute: 0 } }] }).kind).toBe('always_open');
  });
});

describe('rangesForDay', () => {
  it('trie les créneaux et renvoie vide pour un jour fermé', () => {
    expect(rangesForDay(hours, 2)).toEqual(['09:30 – 12:30', '14:00 – 18:00']);
    expect(rangesForDay(hours, 1)).toEqual([]);
  });
});

describe('dayName', () => {
  it('suit la langue', () => {
    expect(dayName(2, 'fr-FR')).toBe('mardi');
    expect(dayName(0, 'en-US')).toBe('Sunday');
  });
});

describe('brouillon admin', () => {
  it('aller-retour jsonb → brouillon → jsonb, fermeture après minuit le lendemain', () => {
    const draft = hoursToDraft(hours);
    expect(draft.days[2]).toEqual([{ open: '09:30', close: '12:30' }, { open: '14:00', close: '18:00' }]);
    const back = draftToHours(draft);
    expect('value' in back && back.value?.periods).toContainEqual(p(6, 22, 0, 0, 2, 0));
  });
  it('rejette une heure mal formée et renvoie null sans créneau', () => {
    const days = Array.from({ length: 7 }, () => [] as { open: string; close: string }[]);
    expect(draftToHours({ alwaysOpen: false, days })).toEqual({ value: null });
    days[1] = [{ open: '9h', close: '18:00' }];
    expect('error' in draftToHours({ alwaysOpen: false, days })).toBe(true);
  });
});
