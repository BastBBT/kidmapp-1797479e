import { useEffect, useSyncExternalStore } from 'react';

/**
 * Registre des fenêtres qui ne doivent pas être recouvertes par une autre (la question
 * « comment as-tu découvert Kidmapp ? », par exemple). Une fenêtre se déclare tant qu'elle est
 * ouverte ou en train de décider de s'ouvrir ; la pop-in « À la une » regarde ce registre et
 * s'efface devant elle. Magasin de module : les deux côtés vivent dans des arbres React distincts.
 */
const active = new Set<string>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useRegisterBlockingOverlay = (key: string, isActive: boolean) => {
  useEffect(() => {
    if (!isActive) return;
    active.add(key);
    emit();
    return () => {
      active.delete(key);
      emit();
    };
  }, [key, isActive]);
};

export const useHasBlockingOverlay = (): boolean =>
  useSyncExternalStore(subscribe, () => active.size > 0, () => false);
