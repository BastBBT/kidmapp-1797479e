import { describe, it, expect, afterEach, vi } from 'vitest';
import { classifySubmitFailure, submitFailureText } from '@/lib/submitFailure';

// Traduction factice : renvoie la clé, ce qui suffit à vérifier quelle famille
// de message est choisie.
const t = ((key: string) => key) as unknown as Parameters<typeof submitFailureText>[1];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('classifySubmitFailure', () => {
  it("traite une colonne disparue comme une version d'app dépassée, pas comme un problème réseau", () => {
    // Le cas réel du 2026-09-01 : les clients d'avant le renommage
    // age_min → age_min_months recevaient ce code.
    expect(classifySubmitFailure({ code: 'PGRST204' })).toEqual({
      kind: 'app_outdated',
      code: 'PGRST204',
    });
  });

  it('distingue un refus RLS d’une erreur inconnue', () => {
    expect(classifySubmitFailure({ code: '42501' }).kind).toBe('session_expired');
    expect(classifySubmitFailure({ code: 'PGRST301' }).kind).toBe('session_expired');
  });

  it('classe une contrainte violée en champ invalide', () => {
    expect(classifySubmitFailure({ code: '23514' }).kind).toBe('invalid_field');
  });

  it('ne retient le réseau que pour un échec de requête sans code', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(classifySubmitFailure(new TypeError('Failed to fetch')).kind).toBe('network');
    // Un code serveur inconnu n'est pas une panne réseau : la requête est bien
    // arrivée.
    expect(classifySubmitFailure({ code: '23503' }).kind).toBe('unknown');
  });

  it('garde le code serveur inconnu pour pouvoir diagnostiquer', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(classifySubmitFailure({ code: 'PGRST100' })).toEqual({
      kind: 'unknown',
      code: 'PGRST100',
    });
  });
});

describe('submitFailureText', () => {
  it('affiche le message de la famille suivi du code technique', () => {
    expect(submitFailureText({ code: 'PGRST204' }, t, 'repli')).toBe(
      'submit_error.app_outdated (PGRST204)',
    );
  });

  it('retombe sur le message du formulaire quand la cause est inconnue', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(submitFailureText({}, t, 'repli')).toBe('repli');
    expect(submitFailureText({ code: 'PGRST100' }, t, 'repli')).toBe('repli (PGRST100)');
  });
});
