import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_SPOTLIGHT_STATE,
  countdownOf,
  decideSpotlight,
  isWeekendEligible,
  pickOccurrence,
  readSpotlightState,
  recordAction,
  recordShown,
  reminderWindow,
  weekendKey,
  writeSpotlightState,
  type SpotlightRule,
  type SpotlightState,
} from '@/lib/eventSpotlight';

// Les dates sont en heure locale (le fuseau des tests est Europe/Paris). Novembre 2026 :
// jeudi 12, mercredi 18, jeudi 19, samedi 21, dimanche 22.
const at = (day: number, hour = 13, month = 10) => new Date(2026, month, day, hour, 0);
const iso = (day: number, month = 11) => `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const rule = (over: Partial<SpotlightRule> = {}): SpotlightRule => ({
  id: 's1', starts_on: iso(12), ends_on: iso(21), frequency: 'weekend', last_reminder: true, ...over,
});

interface Display { day: string; last: boolean; daysUntil: number }

/** Ouvre l'app tous les jours à `hour` h sur [from, to] (novembre) ; `actOn` : jour où le parent tape « Voir ». */
const simulate = (r: SpotlightRule, eventDay: string, from: number, to: number, opts: { hour?: number; actOn?: number; month?: number } = {}) => {
  const out: Display[] = [];
  let state: SpotlightState = EMPTY_SPOTLIGHT_STATE;
  for (let d = from; d <= to; d++) {
    const now = at(d, opts.hour ?? 13, opts.month ?? 10);
    const dec = decideSpotlight(now, r, eventDay, state);
    if (dec.show) {
      state = recordShown(state, now);
      out.push({ day: now.toISOString().slice(0, 10), last: dec.isLast, daysUntil: dec.daysUntil });
      if (opts.actOn === d) state = recordAction(state, 'open');
    }
  }
  return out;
};
const days = (list: Display[]) => list.map((d) => `${d.day.slice(8)}${d.last ? '*' : ''}`);

describe('week-end : jeudi 12 h', () => {
  it('commence le jeudi à midi et finit le dimanche', () => {
    expect(isWeekendEligible(new Date(2026, 10, 12, 11, 59))).toBe(false);
    expect(isWeekendEligible(new Date(2026, 10, 12, 12, 0))).toBe(true);
    expect(isWeekendEligible(new Date(2026, 10, 13, 8, 0))).toBe(true);
    expect(isWeekendEligible(new Date(2026, 10, 15, 22, 0))).toBe(true);
    expect(isWeekendEligible(new Date(2026, 10, 16, 9, 0))).toBe(false);
    expect(isWeekendEligible(new Date(2026, 10, 18, 18, 0))).toBe(false);
  });

  it('rattache lundi à dimanche au même week-end', () => {
    expect(weekendKey('2026-11-16')).toBe('2026-11-22');
    expect(weekendKey('2026-11-19')).toBe('2026-11-22');
    expect(weekendKey('2026-11-22')).toBe('2026-11-22');
    expect(weekendKey('2026-11-23')).toBe('2026-11-29');
  });
});

describe('fenêtre du dernier rappel', () => {
  it('va de J-3 à J, bornée par la période', () => {
    expect(reminderWindow(rule(), iso(21))).toEqual({ from: iso(18), to: iso(21) });
    expect(reminderWindow(rule({ ends_on: iso(20) }), iso(21))).toEqual({ from: iso(18), to: iso(20) });
    expect(reminderWindow(rule({ starts_on: iso(20) }), iso(21))).toEqual({ from: iso(20), to: iso(21) });
  });

  it("n'existe pas si le rappel est désactivé ou si la période ne couvre pas J-3…J", () => {
    expect(reminderWindow(rule({ last_reminder: false }), iso(21))).toBeNull();
    expect(reminderWindow(rule({ ends_on: iso(15) }), iso(21))).toBeNull();
  });
});

describe('sortie le samedi 21/11, période du 12 au 21/11, une fois par week-end', () => {
  it("parent qui n'agit pas : jeudi 12 normal, jeudi 19 vaut rappel", () => {
    const shown = simulate(rule(), iso(21), 9, 24);
    expect(days(shown)).toEqual(['2026-11-12'.slice(8), '19*']);
    expect(shown[1].daysUntil).toBe(2);
  });

  it('parent qui a agi dès jeudi 12 : seulement le rappel du mercredi 18', () => {
    const shown = simulate(rule(), iso(21), 9, 24, { actOn: 12 });
    expect(days(shown)).toEqual(['12', '18*']);
    expect(shown[1].daysUntil).toBe(3);
  });

  it('jeudi avant midi : rien (le week-end n’a pas commencé)', () => {
    expect(simulate(rule(), iso(21), 12, 12, { hour: 11 })).toEqual([]);
    expect(days(simulate(rule(), iso(21), 12, 12, { hour: 12 }))).toEqual(['12']);
  });

  it('jeudi 19 à 9 h : le rappel attend midi, jeudi 19 à 13 h il part', () => {
    const state = recordShown(EMPTY_SPOTLIGHT_STATE, at(12));
    expect(decideSpotlight(at(19, 9), rule(), iso(21), state).show).toBe(false);
    expect(decideSpotlight(at(19, 13), rule(), iso(21), state)).toEqual({ show: true, isLast: true, daysUntil: 2 });
  });

  it('une croix ne fait pas revenir la pop-in le même week-end ni le lendemain', () => {
    const shown = simulate(rule(), iso(21), 12, 18);
    expect(days(shown)).toEqual(['12']);
  });

  it("hors période : rien avant le début, rien après la fin", () => {
    expect(decideSpotlight(at(11), rule(), iso(21), EMPTY_SPOTLIGHT_STATE).show).toBe(false);
    expect(decideSpotlight(at(22), rule(), iso(21), EMPTY_SPOTLIGHT_STATE).show).toBe(false);
  });

  it('le jour de la sortie, le rappel est déjà passé : rien de plus', () => {
    const shown = simulate(rule(), iso(21), 19, 21);
    expect(days(shown)).toEqual(['19*']);
  });
});

describe('sortie le dimanche 15/11, période du 12 au 15/11', () => {
  it('le jeudi 12 vaut à la fois affichage du week-end et rappel (J-3)', () => {
    const shown = simulate(rule({ ends_on: iso(15) }), iso(15), 9, 17);
    expect(days(shown)).toEqual(['12*']);
    expect(shown[0].daysUntil).toBe(3);
  });

  it('un parent qui a déjà agi revoit le rappel une fois, même ce jeudi-là', () => {
    const state = recordAction(recordShown(EMPTY_SPOTLIGHT_STATE, at(5)), 'calendar');
    expect(decideSpotlight(at(12), rule({ ends_on: iso(15) }), iso(15), state)).toEqual({ show: true, isLast: true, daysUntil: 3 });
  });
});

describe('marché de Noël du 28/11 au 24/12, période du 26/11 au 06/12', () => {
  const market = rule({ starts_on: iso(26), ends_on: iso(6, 12) });

  it('jeudi 26 vaut rappel (J-2), jeudi 3 décembre est un affichage normal', () => {
    const out: Display[] = [];
    let state: SpotlightState = EMPTY_SPOTLIGHT_STATE;
    for (let offset = 0; offset < 14; offset++) {
      const now = new Date(2026, 10, 25 + offset, 13, 0);
      const dec = decideSpotlight(now, market, iso(28), state);
      if (dec.show) {
        state = recordShown(state, now);
        out.push({ day: now.toISOString().slice(0, 10), last: dec.isLast, daysUntil: dec.daysUntil });
      }
    }
    expect(out.map((d) => `${d.day.slice(5)}${d.last ? '*' : ''}`)).toEqual(['11-26*', '12-03']);
    expect(out[0].daysUntil).toBe(2);
  });
});

describe('fréquences', () => {
  it('une fois par jour : tous les jours de la période, rappel compris', () => {
    const shown = simulate(rule({ frequency: 'daily' }), iso(21), 10, 22);
    expect(days(shown)).toEqual(['12', '13', '14', '15', '16', '17', '18*', '19*', '20*', '21*']);
  });

  it('une fois par jour, parent qui a agi : seulement le rappel', () => {
    const shown = simulate(rule({ frequency: 'daily' }), iso(21), 12, 22, { actOn: 12 });
    expect(days(shown)).toEqual(['12', '18*']);
  });

  it('une seule fois : le premier jour, puis le rappel dans la fenêtre', () => {
    const shown = simulate(rule({ frequency: 'once' }), iso(21), 10, 22);
    expect(days(shown)).toEqual(['12', '18*']);
  });

  it('une seule fois sans rappel : un seul affichage', () => {
    const shown = simulate(rule({ frequency: 'once', last_reminder: false }), iso(21), 10, 22);
    expect(days(shown)).toEqual(['12']);
  });

  it('sans dernier rappel, un parent qui a agi ne revoit plus rien', () => {
    const shown = simulate(rule({ last_reminder: false }), iso(21), 9, 24, { actOn: 12 });
    expect(days(shown)).toEqual(['12']);
  });

  it('sortie un mardi : le rappel part au premier jour de la fenêtre si le week-end est déjà passé', () => {
    // Sortie mardi 24, période 12→24 : jeudi 19 normal ; la fenêtre 21→24 couvre samedi 21 (même week-end que le 19).
    const shown = simulate(rule({ ends_on: iso(24) }), iso(24), 12, 25);
    expect(days(shown)).toEqual(['12', '19', '21*']);
  });
});

describe('compte à rebours', () => {
  it('dit dans N jours, demain, aujourd’hui', () => {
    expect(countdownOf(3)).toEqual({ kind: 'days', count: 3 });
    expect(countdownOf(2)).toEqual({ kind: 'days', count: 2 });
    expect(countdownOf(1)).toEqual({ kind: 'tomorrow' });
    expect(countdownOf(0)).toEqual({ kind: 'today' });
    expect(countdownOf(-2)).toEqual({ kind: 'today' });
  });
});

describe('sortie à plusieurs créneaux', () => {
  const occ = (id: string, start: string, end: string | null = null) =>
    ({ id, event_id: 'e', date_start: start, date_end: end, time: null });

  it('prend le premier créneau pas encore fini, quel que soit l’ordre reçu', () => {
    const list = [occ('c', '2026-12-05'), occ('a', '2026-11-07'), occ('b', '2026-11-21')];
    expect(pickOccurrence(list, '2026-11-10')?.id).toBe('b');
    expect(pickOccurrence(list, '2026-11-21')?.id).toBe('b');
  });

  it('garde un créneau de plusieurs jours tant qu’il n’est pas terminé', () => {
    expect(pickOccurrence([occ('a', '2026-11-07', '2026-11-12')], '2026-11-12')?.id).toBe('a');
  });

  it('renvoie null quand tout est passé ou quand il n’y a aucun créneau', () => {
    expect(pickOccurrence([occ('a', '2026-11-07')], '2026-11-10')).toBeNull();
    expect(pickOccurrence([], '2026-11-10')).toBeNull();
  });
});

/** Stockage en mémoire : l'environnement de test n'expose pas de localStorage utilisable. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    key: (i) => Array.from(data.keys())[i] ?? null,
  };
}

describe('mémoire sur l’appareil', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retrouve ce qui a été écrit', () => {
    const state = recordAction(recordShown(EMPTY_SPOTLIGHT_STATE, at(12)), 'calendar');
    writeSpotlightState('abc', state);
    expect(readSpotlightState('abc')).toEqual({ shows: [{ day: '2026-11-12' }], acted: true, calendar: true });
  });

  it('une valeur illisible ou mal formée vaut « rien vu »', () => {
    localStorage.setItem('kidmapp_spotlight_x', '{pas du json');
    expect(readSpotlightState('x')).toEqual(EMPTY_SPOTLIGHT_STATE);
    localStorage.setItem('kidmapp_spotlight_y', JSON.stringify({ shows: [{ day: 'hier', last: true }, { day: '2026-11-12', last: false }, 3], acted: 'oui' }));
    expect(readSpotlightState('y')).toEqual({ shows: [{ day: '2026-11-12' }], acted: false, calendar: false });
  });

  it('lit un état enregistré avec l’ancien champ `last` sans le perdre ni le réécrire', () => {
    localStorage.setItem('kidmapp_spotlight_old', JSON.stringify({
      shows: [{ day: '2026-11-12', last: false }, { day: '2026-11-19', last: true }], acted: true, calendar: true,
    }));
    const state = readSpotlightState('old');
    expect(state).toEqual({ shows: [{ day: '2026-11-12' }, { day: '2026-11-19' }], acted: true, calendar: true });
    // La règle en tire les mêmes décisions qu'avant : rappel du 19 déjà montré, rien de plus ce jour-là.
    expect(decideSpotlight(at(19, 15), rule(), iso(21), state).show).toBe(false);
  });

  it('un stockage bloqué ne casse rien, en lecture comme en écriture', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(readSpotlightState('abc')).toEqual(EMPTY_SPOTLIGHT_STATE);
    expect(() => writeSpotlightState('abc', EMPTY_SPOTLIGHT_STATE)).not.toThrow();
  });

  it("n'enregistre jamais plus de soixante affichages", () => {
    let state: SpotlightState = EMPTY_SPOTLIGHT_STATE;
    for (let i = 0; i < 80; i++) state = recordShown(state, at(12));
    expect(state.shows).toHaveLength(60);
  });
});
