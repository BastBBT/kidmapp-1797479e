import { describe, it, expect, afterEach, vi } from 'vitest';
import { classifySubmitFailure, submitFailureText } from '@/lib/submitFailure';

// Traduction factice : renvoie la clé, ce qui suffit à vérifier quelle famille
// de message est choisie.
const t = ((key: string) => key) as unknown as Parameters<typeof submitFailureText>[1];

/**
 * Forme exacte que `postgrest-js` relance quand `fetch` échoue : un objet
 * simple, pas une instance d'Error (`PostgrestBuilder.then`, branche
 * `res.catch`). C'est ce que reçoit le `catch` des formulaires.
 */
const postgrestFetchFailure = {
  message: 'TypeError: Failed to fetch',
  details: 'TypeError: Failed to fetch\n    at …',
  hint: '',
  code: '',
};

/** Forme d'une `StorageApiError` : pas de `code`, mais `status` + `statusCode`. */
function storageError(message: string, status: number, statusCode: string) {
  return Object.assign(new Error(message), { status, statusCode });
}

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

  it('reconnaît la coupure réseau telle que postgrest-js la relance', () => {
    // Navigateur qui se croit en ligne (Wi-Fi sans internet, portail captif,
    // projet Supabase injoignable) : c'est le cas majoritaire, et l'objet
    // relancé n'est pas une instance de TypeError.
    vi.stubGlobal('navigator', { onLine: true });
    expect(classifySubmitFailure(postgrestFetchFailure).kind).toBe('network');
    expect(classifySubmitFailure(new TypeError('Failed to fetch')).kind).toBe('network');
    expect(classifySubmitFailure({ message: 'Load failed', code: '' }).kind).toBe('network');
  });

  it('ne parle pas de réseau quand la requête est arrivée au serveur', () => {
    vi.stubGlobal('navigator', { onLine: false });
    // Même hors ligne d'après le navigateur : un code serveur prouve que la
    // requête a abouti.
    expect(classifySubmitFailure({ code: '23503' }).kind).toBe('unknown');
    expect(classifySubmitFailure({ code: 'PGRST204' }).kind).toBe('app_outdated');
  });

  it('garde le statut du bucket quand une photo est refusée', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(classifySubmitFailure(storageError('Payload too large', 413, '413'))).toEqual({
      kind: 'unknown',
      code: '413',
    });
    expect(classifySubmitFailure(storageError('Unauthorized', 401, '401')).kind).toBe(
      'session_expired',
    );
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

  it('annonce une coupure réseau sans code technique', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(submitFailureText(postgrestFetchFailure, t, 'repli')).toBe('submit_error.network');
  });
});
