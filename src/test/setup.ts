import "@testing-library/jest-dom";

// Cette version de jsdom ne fournit pas `localStorage` (confirmé : `window.localStorage`
// vaut `undefined` dans cet environnement de test, alors qu'il existe bien dans un vrai
// navigateur) — jamais remarqué jusqu'ici car aucun test n'en avait besoin. Plusieurs
// modules de l'app (`assistantSchedule`, `onboardingTracker`, `childrenStorage`…) lisent/
// écrivent directement `localStorage` au niveau module : un polyfill en mémoire, à l'image
// du `matchMedia` ci-dessous, évite de le redécouvrir à chaque nouveau test qui en dépend.
if (!window.localStorage) {
  const backing = new Map<string, string>();
  const memoryStorage: Storage = {
    getItem: (key) => (backing.has(key) ? backing.get(key)! : null),
    setItem: (key, value) => { backing.set(key, String(value)); },
    removeItem: (key) => { backing.delete(key); },
    clear: () => { backing.clear(); },
    key: (index) => Array.from(backing.keys())[index] ?? null,
    get length() { return backing.size; },
  };
  Object.defineProperty(window, "localStorage", { value: memoryStorage, writable: true });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
