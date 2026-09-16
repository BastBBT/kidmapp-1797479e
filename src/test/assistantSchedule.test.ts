import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldShowAssistant, markAssistantShown } from '@/lib/assistantSchedule';

describe('assistantSchedule', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("s'affiche tant que markAssistantShown n'a jamais été appelé", () => {
    expect(shouldShowAssistant()).toBe(true);
  });

  it('markAssistantShown bloque une nouvelle ouverture le même jour', () => {
    markAssistantShown();
    expect(shouldShowAssistant()).toBe(false);
  });

  it('redevient éligible le lendemain', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T23:00:00'));
    markAssistantShown();
    expect(shouldShowAssistant()).toBe(false);

    vi.setSystemTime(new Date('2026-01-02T00:00:01'));
    expect(shouldShowAssistant()).toBe(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ne plante jamais si localStorage est inaccessible (navigation privée) et se replie sur « ne pas montrer »", () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
      },
    });

    try {
      expect(() => shouldShowAssistant()).not.toThrow();
      // Repli sûr : si on ne peut pas savoir si l'assistant a déjà été montré
      // aujourd'hui, on ne l'ouvre pas — mieux vaut un rappel manquant qu'un
      // écran d'accueil qui s'impose à chaque navigation.
      expect(shouldShowAssistant()).toBe(false);
      expect(() => markAssistantShown()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
