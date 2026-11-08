import { describe, expect, it } from 'vitest';
import {
  emptySpotlightForm,
  endForShortcut,
  overlapsOf,
  parseSpotlightStats,
  percentOf,
  clickRate,
  countLabel,
  rateLabel,
  viewedLabel,
  unknownSpotlightStats,
  spotlightStatus,
  validateSpotlight,
  hasStaleDates,
  STALE_DATES_WARNING,
  type SpotlightForm,
} from '@/components/admin/spotlightAdmin';

const event = { date_start: '2026-11-21', date_end: null };
const TODAY = '2026-11-08';

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
    expect(validateSpotlight(form(), event, [], TODAY)).toEqual({ errors: [], warnings: [] });
  });

  it('refuse sans sortie, sans accroche, accroche ou texte trop longs', () => {
    expect(validateSpotlight(form({ event_id: '' }), event, [], TODAY).errors).toContain('Choisis la sortie à mettre en avant.');
    expect(validateSpotlight(form({ headline: '   ' }), event, [], TODAY).errors).toContain("L'accroche est obligatoire.");
    expect(validateSpotlight(form({ headline: 'x'.repeat(51) }), event, [], TODAY).errors).toHaveLength(1);
    expect(validateSpotlight(form({ headline: 'x'.repeat(50) }), event, [], TODAY).errors).toEqual([]);
    expect(validateSpotlight(form({ message: 'x'.repeat(141) }), event, [], TODAY).errors).toHaveLength(1);
    expect(validateSpotlight(form({ message: 'x'.repeat(140) }), event, [], TODAY).errors).toEqual([]);
  });

  it('refuse des dates manquantes ou inversées', () => {
    expect(validateSpotlight(form({ starts_on: '' }), event, [], TODAY).errors).toContain('Renseigne une date de début et de fin.');
    expect(validateSpotlight(form({ ends_on: '2026-11-01' }), event, [], TODAY).errors).toContain('La fin tombe avant le début.');
  });

  it('avertit sans bloquer quand la fin dépasse la sortie ou chevauche une autre mise en avant', () => {
    const late = validateSpotlight(form({ ends_on: '2026-11-25' }), event, [], TODAY);
    expect(late.errors).toEqual([]);
    expect(late.warnings).toHaveLength(1);
    const overlap = validateSpotlight(form(), event, [{ headline: 'Marché de Noël' }], TODAY);
    expect(overlap.errors).toEqual([]);
    expect(overlap.warnings[0]).toContain('« Marché de Noël »');
  });

  it('une sortie sur plusieurs jours n’avertit pas tant que la fin ne la dépasse pas', () => {
    const market = { date_start: '2026-11-28', date_end: '2026-12-24' };
    expect(validateSpotlight(form({ starts_on: '2026-11-26', ends_on: '2026-12-06' }), market, [], TODAY).warnings).toEqual([]);
  });
});

describe('sortie aux dates périmées', () => {
  const stale = { date_start: '2026-10-01', date_end: null };

  it('avertit sans bloquer, une seule fois, sans y ajouter l’avertissement « fin après la sortie »', () => {
    const issues = validateSpotlight(form(), stale, [], TODAY);
    expect(issues.errors).toEqual([]);
    expect(issues.warnings).toEqual([STALE_DATES_WARNING]);
  });

  it('reconnaît des dates périmées, pas une sortie en cours ni du jour', () => {
    expect(hasStaleDates(stale, TODAY)).toBe(true);
    expect(hasStaleDates({ date_start: '2026-10-01', date_end: '2026-11-08' }, TODAY)).toBe(false);
    expect(hasStaleDates({ date_start: '2026-11-08', date_end: null }, TODAY)).toBe(false);
    expect(hasStaleDates(event, TODAY)).toBe(false);
    expect(hasStaleDates(null, TODAY)).toBe(false);
  });
});

describe('période sans moment d’affichage', () => {
  it('avertit quand le week-end n’a aucun jour dans la période et que le rappel est coupé', () => {
    const w = validateSpotlight(form({ starts_on: '2026-11-16', ends_on: '2026-11-18', last_reminder: false }), event, [], TODAY).warnings;
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("ne s'affichera jamais");
  });

  it('avertit aussi quand le rappel est activé mais que la période ne couvre pas J-3 à J et n’a pas de week-end', () => {
    const w = validateSpotlight(form({ starts_on: '2026-11-10', ends_on: '2026-11-11' }), event, [], TODAY).warnings;
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("ne s'affichera jamais");
  });

  it('se tait quand le rappel tombe dans la période, même du lundi au mercredi', () => {
    // Sortie le samedi 21 : le rappel part dès le mercredi 18.
    expect(validateSpotlight(form({ starts_on: '2026-11-16', ends_on: '2026-11-18' }), event, [], TODAY).warnings).toEqual([]);
  });

  it('se tait pour une fréquence quotidienne ou unique, qui n’attend pas le week-end', () => {
    const base = { starts_on: '2026-11-16', ends_on: '2026-11-18', last_reminder: false };
    expect(validateSpotlight(form({ ...base, frequency: 'daily' }), event, [], TODAY).warnings).toEqual([]);
    expect(validateSpotlight(form({ ...base, frequency: 'once' }), event, [], TODAY).warnings).toEqual([]);
  });

  it('prévient que le dernier rappel ne pourra pas s’afficher quand la période finit avant J-3', () => {
    const w = validateSpotlight(form({ starts_on: '2026-11-12', ends_on: '2026-11-14' }), event, [], TODAY).warnings;
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('dernier rappel ne pourra pas');
    expect(validateSpotlight(form({ starts_on: '2026-11-12', ends_on: '2026-11-14', last_reminder: false }), event, [], TODAY).warnings).toEqual([]);
  });

  it('prévient aussi quand une sortie d’un jour est mise en avant après sa date', () => {
    const w = validateSpotlight(form({ starts_on: '2026-11-22', ends_on: '2026-11-29' }), event, [], TODAY).warnings;
    expect(w.some((m) => m.includes('dernier rappel ne pourra pas'))).toBe(true);
  });

  it('ne reproche pas au rappel d’une sortie de plusieurs jours déjà commencée de manquer', () => {
    const market = { date_start: '2026-11-28', date_end: '2026-12-24' };
    expect(validateSpotlight(form({ starts_on: '2026-11-29', ends_on: '2026-12-06' }), market, [], TODAY).warnings).toEqual([]);
  });

  it('ne dit rien de la fenêtre quand les dates de la sortie sont périmées (seul l’avertissement de dates sort)', () => {
    const w = validateSpotlight(form({ starts_on: '2026-11-16', ends_on: '2026-11-18', last_reminder: false }), { date_start: '2026-10-01', date_end: null }, [], TODAY).warnings;
    expect(w).toEqual([STALE_DATES_WARNING]);
  });
});

describe('statistiques', () => {
  const noPlatform = { web: null, ios: null, android: null };
  const unknownNew = {
    sessionsShown: null, sessionsClicked: null, uniqueClickers: null, uniqueOpeners: null,
    uniqueCalendarAdders: null, uniqueDismissers: null, firstShownAt: null, lastShownAt: null, byPlatform: noPlatform,
  };

  it('lit l’ancienne version de la fonction : les nouveaux champs sont « inconnus », pas 0', () => {
    const stats = parseSpotlightStats([
      { id: 'a', shown: 10, shownLast: '3', opens: 4, calendarAdds: 2, dismisses: 5, uniqueViewers: 8 },
      { id: 'b', shown: null },
      { shown: 1 },
      'texte',
      null,
    ]);
    expect(Object.keys(stats)).toEqual(['a', 'b']);
    expect(stats.a).toEqual({ id: 'a', shown: 10, shownLast: 3, opens: 4, calendarAdds: 2, dismisses: 5, uniqueViewers: 8, ...unknownNew });
    expect(stats.b.shown).toBe(0);
    expect(stats.b.uniqueClickers).toBeNull();
  });

  it('lit la version enrichie, y compris les trois plateformes', () => {
    const stats = parseSpotlightStats([{
      id: 'a', shown: 10, shownLast: 3, opens: 4, calendarAdds: 2, dismisses: 5, uniqueViewers: 8,
      sessionsShown: 12, sessionsClicked: 4, uniqueClickers: 3, uniqueOpeners: 2, uniqueCalendarAdders: 1, uniqueDismissers: 4,
      firstShownAt: '2026-11-12T10:05:00+00:00', lastShownAt: '2026-11-19T17:30:00+00:00',
      byPlatform: { web: { viewers: 5, clickers: 1 }, ios: { viewers: 3, clickers: 2 }, android: { viewers: 0, clickers: 0 } },
    }]);
    expect(stats.a).toEqual({
      id: 'a', shown: 10, shownLast: 3, opens: 4, calendarAdds: 2, dismisses: 5, uniqueViewers: 8,
      sessionsShown: 12, sessionsClicked: 4, uniqueClickers: 3, uniqueOpeners: 2, uniqueCalendarAdders: 1, uniqueDismissers: 4,
      firstShownAt: '2026-11-12T10:05:00+00:00', lastShownAt: '2026-11-19T17:30:00+00:00',
      byPlatform: { web: { viewers: 5, clickers: 1 }, ios: { viewers: 3, clickers: 2 }, android: { viewers: 0, clickers: 0 } },
    });
  });

  it('un nouveau champ invalide se lit comme inconnu, sans abîmer les autres', () => {
    const { a } = parseSpotlightStats([{
      id: 'a', shown: 1, uniqueViewers: 2,
      sessionsShown: 'beaucoup', sessionsClicked: -3, uniqueClickers: null, uniqueOpeners: '', uniqueCalendarAdders: {}, uniqueDismissers: 2,
      firstShownAt: 'hier', lastShownAt: 42,
      byPlatform: { web: { viewers: 5 }, ios: 'oui', android: { viewers: 1, clickers: -1 } },
    }]);
    expect(a).toMatchObject({
      shown: 1, uniqueViewers: 2, uniqueDismissers: 2,
      sessionsShown: null, sessionsClicked: null, uniqueClickers: null, uniqueOpeners: null, uniqueCalendarAdders: null,
      firstShownAt: null, lastShownAt: null,
    });
    expect(a.byPlatform).toEqual(noPlatform);
  });

  it('un zéro lisible reste un zéro (une mise en avant sans clic n’est pas « inconnue »)', () => {
    const { a } = parseSpotlightStats([{ id: 'a', uniqueClickers: 0, sessionsShown: '0', byPlatform: { web: { viewers: 0, clickers: 0 } } }]);
    expect(a.uniqueClickers).toBe(0);
    expect(a.sessionsShown).toBe(0);
    expect(a.byPlatform.web).toEqual({ viewers: 0, clickers: 0 });
    expect(a.byPlatform.ios).toBeNull();
  });

  it('une mise en avant sans ligne de résultat : le passé vaut 0, le reste est inconnu', () => {
    const s = unknownSpotlightStats('x');
    expect(s).toMatchObject({ id: 'x', shown: 0, opens: 0, uniqueViewers: 0, ...unknownNew });
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

describe('taux et libellés', () => {
  it('le taux de clic compte des appareils ; inconnu ou sans appareil, il n’y a pas de taux', () => {
    expect(clickRate(3, 8)).toBe(38);
    expect(clickRate(0, 8)).toBe(0);
    expect(clickRate(null, 8)).toBeNull();
    expect(clickRate(3, 0)).toBeNull();
  });

  it('affiche « — » pour l’inconnu, jamais 0, et garde les vrais zéros', () => {
    expect(countLabel(null)).toBe('—');
    expect(countLabel(0)).toBe('0');
    expect(rateLabel(null)).toBe('—');
    expect(rateLabel(0)).toBe('0 %');
    expect(rateLabel(38)).toBe('38 %');
    expect(countLabel(1234)).toBe((1234).toLocaleString('fr-FR'));
  });

  it('« Vue du … au … », « Vue le … » ou rien', () => {
    expect(viewedLabel('2026-11-12T10:05:00+00:00', '2026-11-19T17:30:00+00:00')).toBe('Vue du 12 nov. au 19 nov.');
    expect(viewedLabel('2026-11-12T10:05:00+00:00', '2026-11-12T17:30:00+00:00')).toBe('Vue le 12 nov.');
    expect(viewedLabel(null, '2026-11-19T17:30:00+00:00')).toBeNull();
    expect(viewedLabel(null, null)).toBeNull();
  });

  it('compte le jour à Nantes, pas en UTC (23 h UTC = lendemain à Paris)', () => {
    expect(viewedLabel('2026-11-12T23:30:00+00:00', '2026-11-12T23:45:00+00:00')).toBe('Vue le 13 nov.');
  });
});
