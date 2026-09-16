import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CoachmarkProvider, useCoachmarks } from '@/hooks/useCoachmarks';
import { shouldShowAssistant } from '@/lib/assistantSchedule';

/**
 * Verrouille un invariant signalé fragile en revue de PR (#67, web) : la fin
 * de la visite guidée doit *toujours* marquer l'assistant comme déjà montré
 * pour la journée, sinon son propre effet d'ouverture automatique (déclenché
 * par le passage de `current` à `null`) pourrait le rouvrir immédiatement
 * après la dernière bulle — deux écrans d'accueil plein écran d'affilée.
 *
 * Le couplage vit uniquement dans `useCoachmarks.finish()` (appel à
 * `markAssistantShown()`) : sans ce test, un futur refactor pourrait le
 * retirer sans qu'aucun check mécanique ne le remarque. Miroir de la garantie
 * déjà posée côté iOS/Android (voir la mémoire `project_assistant_mascotte`).
 */
describe('useCoachmarks — couplage avec AssistantSchedule', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('skip() marque l’assistant comme montré aujourd’hui', () => {
    const { result } = renderHook(() => useCoachmarks(), { wrapper: CoachmarkProvider });

    expect(shouldShowAssistant()).toBe(true);

    act(() => result.current.start());
    expect(result.current.current).toBe('categories');

    act(() => result.current.skip());
    expect(result.current.current).toBeNull();
    expect(shouldShowAssistant()).toBe(false);
  });

  it('aller au bout des 4 bulles (next jusqu’à contribute) marque aussi l’assistant comme montré', () => {
    const { result } = renderHook(() => useCoachmarks(), { wrapper: CoachmarkProvider });

    act(() => result.current.start());
    act(() => result.current.next()); // categories -> sorties
    act(() => result.current.next()); // sorties -> propose
    act(() => result.current.next()); // propose -> attend l'ouverture d'une fiche
    act(() => result.current.locationDetailAppeared()); // -> contribute
    expect(result.current.current).toBe('contribute');

    expect(shouldShowAssistant()).toBe(true); // pas encore fini
    act(() => result.current.next()); // contribute -> finish('completed')

    expect(result.current.current).toBeNull();
    expect(shouldShowAssistant()).toBe(false);
  });
});
