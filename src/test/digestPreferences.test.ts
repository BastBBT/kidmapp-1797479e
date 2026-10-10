import { describe, it, expect } from 'vitest';
import {
  capGroups,
  categoryAllowed,
  daysInWindow,
  digestMode,
  groupItems,
  isDayWanted,
  parseDigestDays,
  wantedDaysOf,
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
  it('fenêtre à cheval sur le début des vacances (jeudi 15 → mercredi 21)', () => {
    expect(digestMode(daysInWindow('2026-10-15', '2026-10-22'), weekendOnly, HOLIDAYS)).toBe('holidays');
  });
  it('« toute la semaine » hors vacances = comportement d’avant', () => {
    expect(digestMode(SCHOOL_WINDOW, everyDay, HOLIDAYS)).toBe('week');
  });
  it('« mercredi + week-end » hors vacances', () => {
    expect(digestMode(SCHOOL_WINDOW, wedWeekend, HOLIDAYS)).toBe('week');
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
