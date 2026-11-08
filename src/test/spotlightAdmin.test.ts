import { describe, expect, it } from 'vitest';
import {
  emptySpotlightForm,
  endForShortcut,
  overlapsOf,
  parseSpotlightStats,
  percentOf,
  spotlightStatus,
  validateSpotlight,
  type SpotlightForm,
} from '@/components/admin/spotlightAdmin';

const event = { date_start: '2026-11-21', date_end: null };

const form = (over: Partial<SpotlightForm> = {}): SpotlightForm => ({
  ...emptySpotlightForm('2026-11-12'),
  event_id: 'e1',
  headline: 'Le spectacle à ne pas rater',
  ends_on: '2026-11-21',
  ...over,
});

describe('spotlightStatus', () => {
  const period = { starts_on: '2026-11-12', ends_on: '2026-11-21' };
  it('planifiée avant le début, en cours bornes incluses, terminée après', () => {
    expect(spotlightStatus(period, '2026-11-11')).toBe('planned');
    expect(spotlightStatus(period, '2026-11-12')).toBe('active');
    expect(spotlightStatus(period, '2026-11-21')).toBe('active');
    expect(spotlightStatus(period, '2026-11-22')).toBe('ended');
  });
});

describe('overlapsOf', () => {
  const others = [
    { id: 'a', headline: 'A', starts_on: '2026-11-01', ends_on: '2026-11-11' },
    { id: 'b', headline: 'B', starts_on: '2026-11-21', ends_on: '2026-11-30' },
    { id: 'c', headline: 'C', starts_on: '2026-12-01', ends_on: '2026-12-10' },
  ];
  it('repère les périodes qui se croisent, bornes incluses', () => {
    expect(overlapsOf({ starts_on: '2026-11-12', ends_on: '2026-11-21' }, others).map((o) => o.id)).toEqual(['b']);
    expect(overlapsOf({ starts_on: '2026-11-11', ends_on: '2026-11-11' }, others).map((o) => o.id)).toEqual(['a']);
    expect(overlapsOf({ starts_on: '2026-11-12', ends_on: '2026-11-20' }, others)).toEqual([]);
  });
  it("ne se compte pas lui-même quand on modifie, et ignore des dates incohérentes", () => {
    expect(overlapsOf({ id: 'b', starts_on: '2026-11-21', ends_on: '2026-11-30' }, others)).toEqual([]);
    expect(overlapsOf({ starts_on: '2026-11-30', ends_on: '2026-11-01' }, others)).toEqual([]);
    expect(overlapsOf({ starts_on: '', ends_on: '2026-11-01' }, others)).toEqual([]);
  });
});

describe('raccourcis de fin de période', () => {
  it('« Jusqu’au jour J », « Jusqu’à la fin de la sortie » et « 7 jours »', () => {
    expect(endForShortcut('dayJ', '2026-11-12', event)).toBe('2026-11-21');
    expect(endForShortcut('eventEnd', '2026-11-12', event)).toBe('2026-11-21');
    expect(endForShortcut('eventEnd', '2026-11-12', { date_start: '2026-11-28', date_end: '2026-12-24' })).toBe('2026-12-24');
    expect(endForShortcut('week', '2026-11-12', event)).toBe('2026-11-18');
  });
  it('sans sortie choisie, seuls les 7 jours restent possibles', () => {
    expect(endForShortcut('dayJ', '2026-11-12', null)).toBeNull();
    expect(endForShortcut('week', '2026-11-12', null)).toBe('2026-11-18');
    expect(endForShortcut('week', '', null)).toBeNull();
  });
});

describe('validateSpotlight', () => {
  it('une mise en avant correcte n’a ni erreur ni avertissement', () => {
    expect(validateSpotlight(form(), event, [])).toEqual({ errors: [], warnings: [] });
  });

  it('refuse sans sortie, sans accroche, accroche ou texte trop longs', () => {
    expect(validateSpotlight(form({ event_id: '' }), event, []).errors).toContain('Choisis la sortie à mettre en avant.');
    expect(validateSpotlight(form({ headline: '   ' }), event, []).errors).toContain("L'accroche est obligatoire.");
    expect(validateSpotlight(form({ headline: 'x'.repeat(51) }), event, []).errors).toHaveLength(1);
    expect(validateSpotlight(form({ headline: 'x'.repeat(50) }), event, []).errors).toEqual([]);
    expect(validateSpotlight(form({ message: 'x'.repeat(141) }), event, []).errors).toHaveLength(1);
    expect(validateSpotlight(form({ message: 'x'.repeat(140) }), event, []).errors).toEqual([]);
  });

  it('refuse des dates manquantes ou inversées', () => {
    expect(validateSpotlight(form({ starts_on: '' }), event, []).errors).toContain('Renseigne une date de début et de fin.');
    expect(validateSpotlight(form({ ends_on: '2026-11-01' }), event, []).errors).toContain('La fin tombe avant le début.');
  });

  it('avertit sans bloquer quand la fin dépasse la sortie ou chevauche une autre mise en avant', () => {
    const late = validateSpotlight(form({ ends_on: '2026-11-25' }), event, []);
    expect(late.errors).toEqual([]);
    expect(late.warnings).toHaveLength(1);
    const overlap = validateSpotlight(form(), event, [{ headline: 'Marché de Noël' }]);
    expect(overlap.errors).toEqual([]);
    expect(overlap.warnings[0]).toContain('« Marché de Noël »');
  });

  it('une sortie sur plusieurs jours n’avertit pas tant que la fin ne la dépasse pas', () => {
    const market = { date_start: '2026-11-28', date_end: '2026-12-24' };
    expect(validateSpotlight(form({ starts_on: '2026-11-26', ends_on: '2026-12-06' }), market, []).warnings).toEqual([]);
  });
});

describe('statistiques', () => {
  it('lit le JSON de la fonction, ignore les lignes mal formées, ramène le reste à des nombres', () => {
    const stats = parseSpotlightStats([
      { id: 'a', shown: 10, shownLast: '3', opens: 4, calendarAdds: 2, dismisses: 5, uniqueViewers: 8 },
      { id: 'b', shown: null },
      { shown: 1 },
      'texte',
      null,
    ]);
    expect(Object.keys(stats)).toEqual(['a', 'b']);
    expect(stats.a).toEqual({ id: 'a', shown: 10, shownLast: 3, opens: 4, calendarAdds: 2, dismisses: 5, uniqueViewers: 8 });
    expect(stats.b.shown).toBe(0);
  });

  it('ne casse pas sur autre chose qu’un tableau', () => {
    expect(parseSpotlightStats(null)).toEqual({});
    expect(parseSpotlightStats({ id: 'a' })).toEqual({});
  });

  it('calcule des pourcentages entiers, null sans affichage', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBeNull();
  });
});
