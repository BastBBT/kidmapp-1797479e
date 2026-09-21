const KEY = 'assistant.lastShownWeek';

/** `Date#getDay()` : 0 = dimanche … 5 = vendredi, 6 = samedi. */
const TRIGGER_WEEKDAY = 5;

/**
 * Semaine ISO 8601 (lundi = 1er jour) : on se cale sur le jeudi de la semaine
 * courante, dont l'année civile ne bascule jamais de semaine ISO.
 */
const currentWeek = (): string => {
  const now = new Date();
  const thursday = new Date(now);
  thursday.setDate(now.getDate() + 3 - ((now.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const weekNumber =
    1 + Math.floor((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${thursday.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

/**
 * L'assistant s'ouvre une fois par semaine, le vendredi, au premier passage
 * sur Explorer — le jour où les familles commencent à préparer leur
 * week-end. Le popup quotidien d'origine (jugé trop pressant) est remplacé
 * par cette cadence hebdomadaire ; le rappel manuel (bulle du header) reste
 * le seul accès les autres jours. Drapeau local à l'appareil : se
 * (dé)connecter n'y change rien, comme pour l'onboarding. Miroir de
 * `AssistantSchedule` (iOS et Android).
 */
export const shouldShowAssistant = (): boolean => {
  if (new Date().getDay() !== TRIGGER_WEEKDAY) return false;
  try {
    return localStorage.getItem(KEY) !== currentWeek();
  } catch {
    return false;
  }
};

export const markAssistantShown = () => {
  try {
    localStorage.setItem(KEY, currentWeek());
  } catch {
    // ignore
  }
};
