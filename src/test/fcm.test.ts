import { describe, it, expect } from 'vitest';
import { parseServiceAccount, isUnregisteredError } from '../../supabase/functions/_shared/push/fcm.ts';

// `UNREGISTERED` est le seul code FCM qui signifie « ce token ne fonctionnera
// plus jamais » — les autres (INVALID_ARGUMENT, QUOTA_EXCEEDED, UNAVAILABLE…)
// sont transitoires ou liés au payload, pas à l'appareil. Les confondre
// supprimerait des tokens valides à la moindre erreur passagère.

describe('parseServiceAccount', () => {
  it('accepte un compte de service complet', () => {
    const raw = JSON.stringify({
      client_email: 'fcm-sender@kidmapp-8441f.iam.gserviceaccount.com',
      // Valeur factice : parseServiceAccount ne vérifie que la présence du
      // champ, jamais son contenu PEM (déjà couvert par le test PEM ailleurs).
      private_key: 'not-a-real-key-material',
      project_id: 'kidmapp-8441f',
    });
    const parsed = parseServiceAccount(raw);
    expect(parsed.project_id).toBe('kidmapp-8441f');
  });

  it('refuse un JSON sans client_email', () => {
    const raw = JSON.stringify({ private_key: 'x', project_id: 'kidmapp-8441f' });
    expect(() => parseServiceAccount(raw)).toThrow();
  });

  it('refuse un JSON sans private_key', () => {
    const raw = JSON.stringify({ client_email: 'x@y.com', project_id: 'kidmapp-8441f' });
    expect(() => parseServiceAccount(raw)).toThrow();
  });

  it('refuse un JSON malformé', () => {
    expect(() => parseServiceAccount('{not json')).toThrow();
  });
});

describe('isUnregisteredError', () => {
  it('reconnaît un token désinstallé (UNREGISTERED)', () => {
    const body = JSON.stringify({
      error: {
        status: 'NOT_FOUND',
        details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }],
      },
    });
    expect(isUnregisteredError(body)).toBe(true);
  });

  it('ne traite pas une erreur de payload comme un token mort', () => {
    const body = JSON.stringify({
      error: {
        status: 'INVALID_ARGUMENT',
        details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'INVALID_ARGUMENT' }],
      },
    });
    expect(isUnregisteredError(body)).toBe(false);
  });

  it('ne traite pas un quota dépassé comme un token mort', () => {
    const body = JSON.stringify({
      error: { details: [{ errorCode: 'QUOTA_EXCEEDED' }] },
    });
    expect(isUnregisteredError(body)).toBe(false);
  });

  it('renvoie false sur un corps non-JSON plutôt que de planter', () => {
    expect(isUnregisteredError('<html>502 Bad Gateway</html>')).toBe(false);
  });

  it('renvoie false sur un corps JSON sans champ error', () => {
    expect(isUnregisteredError('{}')).toBe(false);
  });
});
