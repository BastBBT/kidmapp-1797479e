const KEY = 'assistant.lastShownDay';

const today = (): string => {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
};

/**
 * L'assistant s'ouvre une fois par jour, au premier passage sur Explorer.
 * Drapeau local à l'appareil : se (dé)connecter n'y change rien, comme pour
 * l'onboarding. Miroir de `AssistantSchedule` (iOS et Android).
 */
export const shouldShowAssistant = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== today();
  } catch {
    return false;
  }
};

export const markAssistantShown = () => {
  try {
    localStorage.setItem(KEY, today());
  } catch {
    // ignore
  }
};
