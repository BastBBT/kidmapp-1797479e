/** Fenêtres de cohorte de l'entonnoir : « inscrits sur les N derniers jours » ou depuis le début. */
export type FunnelWindow = '7' | '30' | '90' | 'all';

export const FUNNEL_WINDOWS: { key: FunnelWindow; label: string }[] = [
  { key: '7', label: '7 jours' },
  { key: '30', label: '30 jours' },
  { key: '90', label: '90 jours' },
  { key: 'all', label: 'Depuis le début' },
];

/** Une fenêtre du bloc `funnel` de la RPC `admin_engagement_stats` (étapes imbriquées côté SQL). */
export type FunnelCounts = {
  registered: number;
  withChildren: number;
  withZone: number;
  sendEnabled: number;
  receivedSend: number;
  /** Détail de `receivedSend` : peuvent se recouper, ne sont pas des étapes. */
  receivedEmail: number;
  receivedPush: number;
  active: number;
};

export type FunnelStep = {
  key: string;
  label: string;
  hint?: string;
  value: number;
  /** Part restante par rapport à l'étape précédente (100 pour la première). */
  ofPrevious: number;
  /** Part du total des inscrits de la fenêtre. */
  ofTotal: number;
  /** Plus grosse perte du parcours, en nombre de familles. */
  biggestDrop: boolean;
};

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Étapes dans l'ordre du parcours. Chaque valeur est bornée par la précédente : l'entonnoir ne remonte jamais. */
export function buildFunnelSteps(c: FunnelCounts): FunnelStep[] {
  const raw: Pick<FunnelStep, 'key' | 'label' | 'hint' | 'value'>[] = [
    { key: 'registered', label: 'Inscrits', value: c.registered },
    { key: 'withChildren', label: '≥ 1 enfant renseigné', value: c.withChildren },
    { key: 'withZone', label: 'Zone déclarée', value: c.withZone },
    { key: 'sendEnabled', label: 'Envoi activé', hint: 'profil complet', value: c.sendEnabled },
    { key: 'receivedSend', label: 'A reçu ≥ 1 envoi', hint: 'depuis l’inscription', value: c.receivedSend },
    { key: 'active', label: 'Actif ≥ 2 jours', hint: 'sur les 30 derniers jours', value: c.active },
  ];

  let previous = Infinity;
  const clamped = raw.map((s) => {
    previous = Math.min(previous, s.value);
    return { ...s, value: previous };
  });

  const drops = clamped.map((s, i) => (i === 0 ? 0 : clamped[i - 1].value - s.value));
  const worst = Math.max(...drops);
  const worstIndex = worst > 0 ? drops.indexOf(worst) : -1;

  return clamped.map((s, i) => ({
    ...s,
    ofPrevious: i === 0 ? 100 : pct(s.value, clamped[i - 1].value),
    ofTotal: pct(s.value, clamped[0].value),
    biggestDrop: i === worstIndex,
  }));
}
