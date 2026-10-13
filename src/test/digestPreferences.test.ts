import { describe, it, expect } from 'vitest';
import {
  capGroups,
  categoryAllowed,
  daysInWindow,
  digestMode,
  firstWeekendRun,
  groupItems,
  isDayWanted,
  parseDigestDays,
  upcomingHoliday,
  wantedDaysOf,
  weekendRuns,
  type DigestPrefs,
  type SchoolHoliday,
} from '../../supabase/functions/_shared/digest/preferences.ts';
import { EVENT_CATEGORIES, isCategoryOn, toggleCategory } from '@/lib/digestPreferences';

// Calendrier réel de la zone B (seed `school_holidays`).
const TOUSSAINT: SchoolHoliday = { label: 'Vacances de la Toussaint', first_day: '2026-10-17', last_day: '2026-11-01' };
const HOLIDAYS = [TOUSSAINT];

const weekendOnly: DigestPrefs = { digestDays: 'weekend', holidaysAllWeek: true, eventCategories: null };
const weekendStrict: DigestPrefs = { digestDays: 'weekend', holidaysAllWeek: false, eventCategories: null };
const wedWeekend: DigestPrefs = { digestDays: 'wed_weekend', holidaysAllWeek: true, eventCategories: null };
const everyDay: DigestPrefs = { digestDays: 'all', holidaysAllWeek: true, eventCategories: null };

// Mail du jeudi 8 octobre (période scolaire) : fenêtre jeu. 8 → mer. 14.
const SCHOOL_WINDOW = daysInWindow('2026-10-08', '2026-10-15');
// Mail du jeudi 22 octobre (Toussaint) : fenêtre jeu. 22 → mer. 28.
const HOLIDAY_WINDOW = daysInWindow('2026-10-22', '2026-10-29');

describe('daysInWindow', () => {
  it('liste les 7 jours de la fenêtre, borne de fin exclue', () => {
    expect(SCHOOL_WINDOW).toEqual([
      '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14',
    ]);
  });
});

describe('isDayWanted', () => {
  it('« week-end » en période scolaire : samedi et dimanche seulement', () => {
    expect(isDayWanted('2026-10-10', weekendOnly, HOLIDAYS)).toBe(true); // samedi
    expect(isDayWanted('2026-10-11', weekendOnly, HOLIDAYS)).toBe(true); // dimanche
    expect(isDayWanted('2026-10-13', weekendOnly, HOLIDAYS)).toBe(false); // mardi
    expect(isDayWanted('2026-10-14', weekendOnly, HOLIDAYS)).toBe(false); // mercredi
  });

  it('« mercredi + week-end » ajoute le mercredi', () => {
    expect(isDayWanted('2026-10-14', wedWeekend, HOLIDAYS)).toBe(true);
    expect(isDayWanted('2026-10-13', wedWeekend, HOLIDAYS)).toBe(false);
  });

  it('pendant les vacances, toute la semaine si l’interrupteur est activé', () => {
    expect(isDayWanted('2026-10-27', weekendOnly, HOLIDAYS)).toBe(true); // mardi de vacances
    expect(isDayWanted('2026-10-27', weekendStrict, HOLIDAYS)).toBe(false);
  });

  it('les bornes des vacances sont incluses', () => {
    expect(isDayWanted('2026-11-02', weekendOnly, HOLIDAYS)).toBe(false); // lundi de rentrée
    expect(isDayWanted('2026-10-16', weekendOnly, HOLIDAYS)).toBe(false); // vendredi avant
  });

  it('« toute la semaine » prend tout', () => {
    expect(isDayWanted('2026-10-13', everyDay, [])).toBe(true);
  });
});

describe('wantedDaysOf', () => {
  it('une expo qui court toute la semaine garde ses jours de week-end', () => {
    const expo = { date_start: '2026-09-01', date_end: '2026-11-01' };
    expect(wantedDaysOf(expo, SCHOOL_WINDOW, weekendOnly, HOLIDAYS)).toEqual(['2026-10-10', '2026-10-11']);
  });

  it('un atelier du mardi disparaît pour un parent « week-end »', () => {
    const atelier = { date_start: '2026-10-13', date_end: null };
    expect(wantedDaysOf(atelier, SCHOOL_WINDOW, weekendOnly, HOLIDAYS)).toEqual([]);
  });

  it('date_end antérieure ou nulle = un seul jour', () => {
    expect(wantedDaysOf({ date_start: '2026-10-10', date_end: '2026-10-01' }, SCHOOL_WINDOW, everyDay, [])).toEqual([
      '2026-10-10',
    ]);
  });
});

describe('categoryAllowed', () => {
  it('null ou vide = tout passe', () => {
    expect(categoryAllowed('Marché', null)).toBe(true);
    expect(categoryAllowed('Marché', [])).toBe(true);
  });
  it('sinon seulement les catégories choisies', () => {
    expect(categoryAllowed('Marché', ['Spectacle', 'Atelier'])).toBe(false);
    expect(categoryAllowed('Atelier', ['Spectacle', 'Atelier'])).toBe(true);
    expect(categoryAllowed(null, ['Atelier'])).toBe(false);
  });
});

describe('parseDigestDays', () => {
  it('valeur inconnue = tous les jours', () => {
    expect(parseDigestDays('weekend')).toBe('weekend');
    expect(parseDigestDays('nimporte')).toBe('all');
    expect(parseDigestDays(null)).toBe('all');
  });
});

describe('digestMode', () => {
  it('« week-end » hors vacances', () => {
    expect(digestMode(SCHOOL_WINDOW, weekendOnly, HOLIDAYS)).toBe('weekend');
  });
  it('« week-end » pendant la Toussaint, interrupteur activé', () => {
    expect(digestMode(HOLIDAY_WINDOW, weekendOnly, HOLIDAYS)).toBe('holidays');
  });
  it('« week-end » pendant la Toussaint, interrupteur coupé', () => {
    expect(digestMode(HOLIDAY_WINDOW, weekendStrict, HOLIDAYS)).toBe('weekend');
  });
  it('fenêtre à cheval sur le début des vacances (jeudi 15 → mercredi 21) : sélection normale, pas « C\'est les vacances »', () => {
    expect(digestMode(daysInWindow('2026-10-15', '2026-10-22'), weekendOnly, HOLIDAYS)).toBe('week');
  });
  it('mail du mardi 13 octobre, « mercredi + week-end » : seul le lundi 19 est ajouté, pas de mode vacances', () => {
    expect(digestMode(daysInWindow('2026-10-13', '2026-10-20'), wedWeekend, HOLIDAYS)).toBe('week');
  });
  it('fenêtre qui commence en vacances et finit après la reprise (mardi 27 → lundi 2) : mode vacances', () => {
    expect(digestMode(daysInWindow('2026-10-27', '2026-11-03'), wedWeekend, HOLIDAYS)).toBe('holidays');
  });
  it('fenêtre qui commence en vacances un samedi (envoi samedi 17) : mode vacances', () => {
    expect(digestMode(daysInWindow('2026-10-17', '2026-10-24'), weekendOnly, HOLIDAYS)).toBe('holidays');
  });
  it('première semaine après la reprise : plus rien de vacances', () => {
    expect(digestMode(daysInWindow('2026-11-03', '2026-11-10'), wedWeekend, HOLIDAYS)).toBe('week');
    expect(upcomingHoliday(daysInWindow('2026-11-03', '2026-11-10'), wedWeekend, HOLIDAYS)).toBeNull();
  });
  it('« toute la semaine » hors vacances = comportement d’avant', () => {
    expect(digestMode(SCHOOL_WINDOW, everyDay, HOLIDAYS)).toBe('week');
  });
  it('« toute la semaine » pendant les vacances : mail inchangé, pas de mode vacances', () => {
    expect(digestMode(HOLIDAY_WINDOW, everyDay, HOLIDAYS)).toBe('week');
  });
  it('vacances qui ne touchent que le week-end de la fenêtre : pas de mode vacances', () => {
    // Mail du lundi 12 octobre (fenêtre lun. 12 → dim. 18), Toussaint à partir du sam. 17.
    expect(digestMode(daysInWindow('2026-10-12', '2026-10-19'), wedWeekend, HOLIDAYS)).toBe('week');
    expect(digestMode(daysInWindow('2026-10-12', '2026-10-19'), weekendOnly, HOLIDAYS)).toBe('weekend');
  });
  it('« mercredi + week-end » hors vacances', () => {
    expect(digestMode(SCHOOL_WINDOW, wedWeekend, HOLIDAYS)).toBe('week');
  });
});

describe('upcomingHoliday', () => {
  it('mail du mardi 13 octobre, « mercredi + week-end » : Toussaint annoncée, lundi 19 ajouté', () => {
    expect(upcomingHoliday(daysInWindow('2026-10-13', '2026-10-20'), wedWeekend, HOLIDAYS)).toEqual({
      holiday: TOUSSAINT,
      addedDays: ['2026-10-19'],
    });
  });
  it('mail du vendredi 16 octobre, « mercredi + week-end » : lun., mar., jeu. ajoutés (le mercredi l\'était déjà)', () => {
    expect(upcomingHoliday(daysInWindow('2026-10-16', '2026-10-23'), wedWeekend, HOLIDAYS)?.addedDays).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-22',
    ]);
  });
  it('vacances qui ne touchent que le week-end (mail du lundi 12) : rien à annoncer', () => {
    expect(upcomingHoliday(daysInWindow('2026-10-12', '2026-10-19'), wedWeekend, HOLIDAYS)).toBeNull();
  });
  it('fenêtre qui commence déjà en vacances : pas d\'annonce, c\'est le mode vacances', () => {
    expect(upcomingHoliday(HOLIDAY_WINDOW, wedWeekend, HOLIDAYS)).toBeNull();
  });
  it('« toute la semaine » ou interrupteur coupé : rien à annoncer', () => {
    const window = daysInWindow('2026-10-13', '2026-10-20');
    expect(upcomingHoliday(window, everyDay, HOLIDAYS)).toBeNull();
    expect(upcomingHoliday(window, weekendStrict, HOLIDAYS)).toBeNull();
  });
});

describe('groupItems / capGroups', () => {
  const sat = { id: 'sat', wantedDays: ['2026-10-10'] };
  const sun = { id: 'sun', wantedDays: ['2026-10-11'] };
  const expo = { id: 'expo', wantedDays: ['2026-10-10', '2026-10-11'] };
  const wed = { id: 'wed', wantedDays: ['2026-10-14'] };
  const thu = { id: 'thu', wantedDays: ['2026-10-08'] };

  it('mode week-end : samedi, dimanche, puis tout le week-end', () => {
    const groups = groupItems([expo, sun, sat], 'weekend');
    expect(groups.map((g) => [g.kind, g.day, g.items.map((i) => i.id)])).toEqual([
      ['day', '2026-10-10', ['sat']],
      ['day', '2026-10-11', ['sun']],
      ['whole_weekend', null, ['expo']],
    ]);
  });

  it('sinon : ce week-end d’abord, puis le reste de la semaine', () => {
    const groups = groupItems([thu, sat, wed, expo], 'week');
    expect(groups.map((g) => [g.kind, g.day, g.items.map((i) => i.id)])).toEqual([
      ['this_weekend', null, ['sat', 'expo']],
      ['rest_of_week', null, ['thu', 'wed']],
    ]);
  });

  it('le reste de la semaine porte son jour quand il est unique (mercredi)', () => {
    const groups = groupItems([sat, wed], 'week');
    expect(groups[1]).toMatchObject({ kind: 'rest_of_week', day: '2026-10-14' });
  });

  it('plafond : le week-end passe en premier, les groupes vidés disparaissent', () => {
    const groups = groupItems([thu, wed, sat, sun, expo], 'week');
    const capped = capGroups(groups, 2);
    expect(capped.map((g) => g.items.map((i) => i.id))).toEqual([['sat', 'sun']]);
  });
});

// --- Écran Mon compte (src/lib/digestPreferences.ts) ---

describe('toggleCategory', () => {
  it('décocher depuis « tout » (null) écrit la liste sans la catégorie', () => {
    expect(toggleCategory(null, EVENT_CATEGORIES, 'Marché')).toEqual([
      'Spectacle', 'Atelier', 'Festival', 'Fête', 'Exposition', 'Autre',
    ]);
  });

  it('recocher la dernière manquante revient à null (tout)', () => {
    const sansMarche = toggleCategory(null, EVENT_CATEGORIES, 'Marché');
    expect(toggleCategory(sansMarche, EVENT_CATEGORIES, 'Marché')).toBeNull();
  });

  it('impossible de décocher la dernière catégorie', () => {
    expect(toggleCategory(['Atelier'], EVENT_CATEGORIES, 'Atelier')).toEqual(['Atelier']);
  });

  it('garde l’ordre de référence', () => {
    expect(toggleCategory(['Exposition'], EVENT_CATEGORIES, 'Spectacle')).toEqual(['Spectacle', 'Exposition']);
  });

  it('isCategoryOn : null = tout coché', () => {
    expect(isCategoryOn(null, 'Marché')).toBe(true);
    expect(isCategoryOn(['Atelier'], 'Marché')).toBe(false);
  });
});

describe('groupItems — titre du reste de la semaine', () => {
  it('une sortie sur plusieurs jours de semaine garde « Le reste de la semaine »', () => {
    const sat = { id: 'sat', wantedDays: ['2026-10-10'] };
    const expoSemaine = { id: 'expo', wantedDays: ['2026-10-12', '2026-10-13'] };
    const groups = groupItems([sat, expoSemaine], 'week');
    expect(groups[1]).toMatchObject({ kind: 'rest_of_week', day: null });
  });
});

// Mail du dimanche 11 octobre : fenêtre dim. 11 → sam. 17, soit la fin du week-end en cours puis
// le samedi suivant — deux séries d'un jour, pas « un week-end ».
describe('envoi un dimanche', () => {
  const SUNDAY_WINDOW = daysInWindow('2026-10-11', '2026-10-18');
  const sun = { id: 'sun', wantedDays: ['2026-10-11'] };
  const nextSat = { id: 'nextSat', wantedDays: ['2026-10-17'] };
  const expo = { id: 'expo', wantedDays: ['2026-10-11', '2026-10-17'] };
  const tue = { id: 'tue', wantedDays: ['2026-10-13'] };

  it('weekendRuns : deux séries d’un jour ; envoyé un jeudi, un seul week-end complet', () => {
    expect(weekendRuns(SUNDAY_WINDOW)).toEqual([['2026-10-11'], ['2026-10-17']]);
    expect(weekendRuns(SCHOOL_WINDOW)).toEqual([['2026-10-10', '2026-10-11']]);
    expect(firstWeekendRun(SUNDAY_WINDOW)).toEqual(['2026-10-11']);
    expect(firstWeekendRun(daysInWindow('2026-10-12', '2026-10-15'))).toEqual([]);
  });

  it('mode semaine : le samedi suivant est « le reste de la semaine », pas « ce week-end »', () => {
    const groups = groupItems([sun, nextSat, tue, expo], 'week', firstWeekendRun(SUNDAY_WINDOW));
    expect(groups.map((g) => [g.kind, g.items.map((i) => i.id)])).toEqual([
      ['this_weekend', ['sun', 'expo']],
      ['rest_of_week', ['nextSat', 'tue']],
    ]);
  });

  it('mode week-end : une expo sur dim. 11 et sam. 17 n’est pas « tout le week-end »', () => {
    const groups = groupItems([expo, nextSat, sun], 'weekend', firstWeekendRun(SUNDAY_WINDOW));
    expect(groups.map((g) => [g.kind, g.day, g.items.map((i) => i.id)])).toEqual([
      ['day', '2026-10-11', ['expo', 'sun']],
      ['day', '2026-10-17', ['nextSat']],
    ]);
  });

  it('un week-end complet reste « tout le week-end » (envoi un jeudi)', () => {
    const satSun = { id: 'both', wantedDays: ['2026-10-10', '2026-10-11'] };
    const groups = groupItems([satSun], 'weekend', firstWeekendRun(SCHOOL_WINDOW));
    expect(groups.map((g) => g.kind)).toEqual(['whole_weekend']);
  });

  it('digestMode : un parent « week-end » reste en mode week-end', () => {
    expect(digestMode(SUNDAY_WINDOW, weekendStrict, HOLIDAYS)).toBe('weekend');
  });
});
