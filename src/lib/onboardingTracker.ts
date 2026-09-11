import { supabase } from '@/integrations/supabase/client';

/**
 * Issue d'un parcours d'accueil.
 *
 * `completed` : a cliqué « Créer mon compte » ou « Se connecter » depuis le
 * dernier slide. `skipped` : a cliqué « Passer » (ou « Découvrir sans compte »)
 * avant la fin.
 */
export type OnboardingOutcome = 'completed' | 'skipped';

/**
 * Retient jusqu'où va chaque nouvel arrivant dans l'accueil.
 *
 * L'accueil et les bulles tournent **avant l'authentification** : aucune ligne
 * `profiles` n'existe encore au moment où l'utilisateur avance. On accumule donc
 * en local, et `flush()` recopie le tout à la première session connectée — un
 * cran de plus que la question d'acquisition, qui s'affiche après l'inscription
 * et peut écrire directement.
 *
 * Conséquence assumée : quelqu'un qui ne crée jamais de compte reste invisible.
 * On mesure « parmi les comptes créés, combien ont vu l'accueil en entier », pas
 * le taux d'abandon global.
 *
 * Miroir de `OnboardingTracker` sur iOS et Android : mêmes clés de sémantique,
 * mêmes colonnes Supabase.
 */
const KEY = {
  stepMax: 'onboarding.stepMax',
  outcome: 'onboarding.outcome',
  completedAt: 'onboarding.completedAt',
  coachmarks: 'onboarding.coachmarksOutcome',
  flushed: 'onboarding.flushed',
  coachmarksSeen: 'coachmarks.seen',
} as const;

/** Un navigateur en navigation privée peut refuser localStorage : on n'échoue jamais dessus. */
const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ignore
  }
};

const remove = (k: string) => {
  try {
    localStorage.removeItem(k);
  } catch {
    // ignore
  }
};

/**
 * Slide atteint (1-indexé). On ne garde que le maximum : revenir en arrière d'un
 * swipe ne doit pas effacer le fait d'être allé plus loin.
 */
export const recordStep = (step: number) => {
  const current = Number(read(KEY.stepMax) ?? 0);
  if (step > current) write(KEY.stepMax, String(step));
};

export const recordSlidesOutcome = (outcome: OnboardingOutcome) => {
  // Avoir vu l'accueil donne droit à la visite guidée : c'est la définition même
  // de « nouvel arrivant ». Sans cette ligne, un navigateur dont le drapeau des
  // bulles est déjà posé resterait muet même après un accueil rejoué.
  remove(KEY.coachmarksSeen);

  // L'issue elle-même ne s'enregistre qu'une fois : un « Passer » tardif ne doit
  // pas écraser un parcours déjà marqué comme terminé.
  if (read(KEY.outcome)) return;
  write(KEY.outcome, outcome);
  write(KEY.completedAt, new Date().toISOString());
};

export const recordCoachmarksOutcome = (outcome: OnboardingOutcome) => {
  if (read(KEY.coachmarks)) return;
  write(KEY.coachmarks, outcome);
};

export const hasSeenCoachmarks = () => read(KEY.coachmarksSeen) === 'true';
export const markCoachmarksSeen = () => write(KEY.coachmarksSeen, 'true');

/** Deux appelants possibles (montage et connexion) : verrou en vol contre le double UPDATE. */
let isFlushing = false;

/**
 * À appeler à chaque démarrage de session authentifiée. Ne part qu'une fois, et
 * seulement s'il y a quelque chose à dire.
 */
export const flush = async (userId: string) => {
  if (isFlushing) return;
  if (read(KEY.flushed) === 'true') return;
  const outcome = read(KEY.outcome);
  if (!outcome) return;

  isFlushing = true;
  try {
    const stepMax = Math.min(3, Math.max(1, Number(read(KEY.stepMax) ?? 1)));
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_step_max: stepMax,
        onboarding_outcome: outcome,
        onboarding_completed_at: read(KEY.completedAt),
        coachmarks_outcome: read(KEY.coachmarks),
      })
      .eq('id', userId);
    if (error) throw error;
    write(KEY.flushed, 'true');
  } catch (e) {
    // Silencieux et réessayable : une statistique d'accueil ne bloque rien, et le
    // drapeau reste absent pour retenter à la session suivante.
    console.error('onboarding flush failed, will retry next session', e);
  } finally {
    isFlushing = false;
  }
};
