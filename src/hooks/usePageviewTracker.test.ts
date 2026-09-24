import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDeviceId, getSessionId } from './usePageviewTracker';

// Règle partagée avec les apps iOS/Android : une session se renouvelle après
// 30 min sans page vue. Si elle dérive (mauvaise unité, lastSeen non rafraîchi),
// les « sessions » de l'onglet Audience ne se comparent plus d'une plateforme à l'autre.
const MINUTE = 60 * 1000;

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

describe('usePageviewTracker — identifiants de mesure d’audience', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('garde le même device_id d’une visite à l’autre', () => {
    const first = getDeviceId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(getDeviceId()).toBe(first);
  });

  it('réutilise la session tant que les pages se suivent à moins de 30 min', () => {
    const first = getSessionId();
    vi.advanceTimersByTime(20 * MINUTE);
    expect(getSessionId()).toBe(first);
    // lastSeen est rafraîchi à chaque page : 20 + 20 min au total, mais jamais 30 d'affilée.
    vi.advanceTimersByTime(20 * MINUTE);
    expect(getSessionId()).toBe(first);
  });

  it('ouvre une nouvelle session après 30 min d’inactivité', () => {
    const first = getSessionId();
    vi.advanceTimersByTime(30 * MINUTE);
    expect(getSessionId()).not.toBe(first);
  });

  it('repart sur une session neuve si le stockage est corrompu', () => {
    localStorage.setItem('kidmapp.audience.session', '{pas du json');
    expect(getSessionId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('renvoie null sans planter si le stockage est bloqué', () => {
    vi.stubGlobal('localStorage', {
      ...memoryStorage(),
      getItem: () => { throw new Error('SecurityError'); },
    });
    expect(getDeviceId()).toBeNull();
    expect(getSessionId()).toBeNull();
  });
});
