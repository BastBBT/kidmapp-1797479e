import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  hasSeenCoachmarks,
  markCoachmarksSeen,
  recordCoachmarksOutcome,
} from '@/lib/onboardingTracker';

/**
 * Quatre bulles enchaînées, jouées une seule fois, juste après l'accueil : le
 * sélecteur Lieux/Activités, l'onglet Sorties, le bouton Proposer, puis la carte
 * « Confirmer les infos » d'une fiche. Les trois premières vivent sur Explorer ;
 * la quatrième a besoin d'une fiche ouverte, d'où le détour par
 * `wantsLocationDetail`.
 *
 * Miroir de `CoachmarkStep` / `CoachmarkManager` sur iOS et Android.
 */
export const COACHMARK_STEPS = ['categories', 'sorties', 'propose', 'contribute'] as const;
export type CoachmarkStep = (typeof COACHMARK_STEPS)[number];

export const stepNumber = (step: CoachmarkStep) => COACHMARK_STEPS.indexOf(step) + 1;
export const STEP_TOTAL = COACHMARK_STEPS.length;

/** La dernière bulle n'a pas de « Passer » : son bouton termine déjà la visite. */
export const canSkipStep = (step: CoachmarkStep) => step !== 'contribute';

export const stepRadius = (step: CoachmarkStep) => {
  if (step === 'propose') return 999;
  if (step === 'contribute') return 16;
  return 12;
};

interface CoachmarkContextValue {
  current: CoachmarkStep | null;
  /** Passe à true quand la bulle 3 demande l'ouverture d'une fiche. */
  wantsLocationDetail: boolean;
  register: (step: CoachmarkStep, el: HTMLElement | null) => void;
  targetOf: (step: CoachmarkStep) => HTMLElement | null;
  start: () => void;
  next: () => void;
  skip: () => void;
  locationDetailRequestHandled: () => void;
  locationDetailAppeared: () => void;
  locationDetailUnavailable: () => void;
}

const CoachmarkContext = createContext<CoachmarkContextValue | null>(null);

export const CoachmarkProvider = ({ children }: { children: ReactNode }) => {
  const [current, setCurrent] = useState<CoachmarkStep | null>(null);
  const [wantsLocationDetail, setWantsLocationDetail] = useState(false);
  const awaitingDetail = useRef(false);
  const targets = useRef(new Map<CoachmarkStep, HTMLElement>());

  const register = useCallback((step: CoachmarkStep, el: HTMLElement | null) => {
    // Une callback ref est appelée avec `null` pendant la phase de mutation de
    // React. Déclencher un setState ici peut relancer le détachement des refs et
    // créer une boucle synchrone. La Map est volontairement mise à jour sans
    // provoquer de rendu ; les cibles existent avant le démarrage de leur étape.
    const previous = targets.current.get(step) ?? null;
    if (previous === el) return;
    if (el) targets.current.set(step, el);
    else targets.current.delete(step);
  }, []);

  const targetOf = useCallback(
    (step: CoachmarkStep) => targets.current.get(step) ?? null,
    [],
  );

  const finish = useCallback((outcome: 'completed' | 'skipped') => {
    awaitingDetail.current = false;
    setWantsLocationDetail(false);
    markCoachmarksSeen();
    recordCoachmarksOutcome(outcome);
    setCurrent(null);
  }, []);

  const start = useCallback(() => {
    if (hasSeenCoachmarks()) return;
    setCurrent((c) => c ?? 'categories');
  }, []);

  const next = useCallback(() => {
    // On lit `current` depuis la portée plutôt que via un updater : un updater
    // setState doit rester pur, et React peut le rejouer (StrictMode).
    if (current === 'categories') {
      setCurrent('sorties');
      return;
    }
    if (current === 'sorties') {
      setCurrent('propose');
      return;
    }
    if (current === 'propose') {
      // On sort du halo le temps de la navigation, sinon la bulle reste posée
      // sur un écran qui change.
      awaitingDetail.current = true;
      setCurrent(null);
      setWantsLocationDetail(true);
      return;
    }
    if (current === 'contribute') finish('completed');
  }, [current, finish]);

  const skip = useCallback(() => finish('skipped'), [finish]);

  const locationDetailRequestHandled = useCallback(
    () => setWantsLocationDetail(false),
    [],
  );

  /** Appelé par la fiche lieu quand elle est prête. */
  const locationDetailAppeared = useCallback(() => {
    if (!awaitingDetail.current) return;
    awaitingDetail.current = false;
    setCurrent('contribute');
  }, []);

  /**
   * Aucune fiche à ouvrir (liste vide, chargement raté) : on s'arrête là plutôt
   * que de laisser la visite en suspens, et ça compte comme terminé — sinon une
   * coupure réseau fabriquerait de faux abandons.
   */
  const locationDetailUnavailable = useCallback(() => {
    if (!awaitingDetail.current) return;
    finish('completed');
  }, [finish]);

  const value = useMemo(
    () => ({
      current,
      wantsLocationDetail,
      register,
      targetOf,
      start,
      next,
      skip,
      locationDetailRequestHandled,
      locationDetailAppeared,
      locationDetailUnavailable,
    }),
    [
      current,
      wantsLocationDetail,
      register,
      targetOf,
      start,
      next,
      skip,
      locationDetailRequestHandled,
      locationDetailAppeared,
      locationDetailUnavailable,
    ],
  );

  return <CoachmarkContext.Provider value={value}>{children}</CoachmarkContext.Provider>;
};

export const useCoachmarks = () => {
  const ctx = useContext(CoachmarkContext);
  if (!ctx) throw new Error('useCoachmarks must be used inside CoachmarkProvider');
  return ctx;
};

/**
 * Désigne un élément comme cible d'une bulle. Callback ref, à poser directement
 * sur le conteneur visé : `<div ref={useCoachmarkTarget('categories')}>`.
 */
export const useCoachmarkTarget = (step: CoachmarkStep) => {
  const { register } = useCoachmarks();
  return useCallback(
    (node: HTMLElement | null) => register(step, node),
    [register, step],
  );
};
