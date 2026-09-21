import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { CategoryGroup, LocationCategory } from '@/types/location';
import { AGE_LABEL_KEY, AgeBucket, bucketForChildMonths } from '@/lib/ageFilter';
import { Child, ChildFilterSelection, ageInMonths } from '@/lib/children';
import { MealType } from '@/hooks/useMeals';
import { translateToken } from '@/i18n/tokenMaps';
import { recordAssistantCompleted, recordAssistantOpened } from '@/lib/assistantUsageTracker';
import { MascotteMedallion } from '@/components/Mascotte';

/**
 * Ce que l'assistant pose comme filtres quand le parent va au bout des trois
 * questions. Rien d'inventé : chaque champ correspond à un réglage qui existe
 * déjà dans Explorer — l'assistant coche dans les barres, il ne superpose
 * aucun état qui lui serait propre.
 */
export interface AssistantOutcome {
  group: CategoryGroup;
  category: LocationCategory | null;
  ageBucket: Exclude<AgeBucket, 'all'> | null;
  /** Quand le profil famille existe, source de vérité du filtre d'âge —
   *  prioritaire sur `ageBucket` (qui n'a de sens que sans profil). */
  childSelection: ChildFilterSelection | null;
  weather: string | null;
  duration: string | null;
  mealId: string | null;
}

type Need = 'activites' | 'manger' | 'air';
type Step = 'need' | 'who' | 'context';

const NEEDS: { id: Need; emoji: string; titleKey: string; subtitleKey: string }[] = [
  { id: 'activites', emoji: '🧸', titleKey: 'assistant.need_activities_title', subtitleKey: 'assistant.need_activities_subtitle' },
  { id: 'manger', emoji: '🍽️', titleKey: 'assistant.need_meal_title', subtitleKey: 'assistant.need_meal_subtitle' },
  { id: 'air', emoji: '🌳', titleKey: 'assistant.need_air_title', subtitleKey: 'assistant.need_air_subtitle' },
];

const needGroup = (need: Need): CategoryGroup => (need === 'manger' ? 'places' : 'activities');
// « Manger dehors » vise restaurants ET cafés, ce qu'une pastille unique ne
// sait pas dire — le repas choisi à la question 3 s'en charge (seuls ces
// lieux-là en servent). On reste donc sur « Tout » des Lieux.
const needCategory = (need: Need): LocationCategory | null => (need === 'air' ? 'nature' : null);

const AGE_BUCKET_CHOICES: Exclude<AgeBucket, 'all'>[] = ['0-2', '3-5', '6+'];

interface AssistantProps {
  open: boolean;
  catalogCount: number | null;
  kids: Child[];
  mealTypes: MealType[];
  onFinish: (outcome: AssistantOutcome) => void;
  onSkip: () => void;
}

interface ChoiceCardProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  onClick: () => void;
}

const ChoiceCard = ({ emoji, title, subtitle, onClick }: ChoiceCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left transition-transform active:scale-[0.99]"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 11,
      width: '100%',
      padding: '12px 13px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      cursor: 'pointer',
    }}
  >
    {emoji && <span style={{ fontSize: 19, lineHeight: '22px' }}>{emoji}</span>}
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      {subtitle && (
        <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</span>
      )}
    </span>
  </button>
);

/**
 * Assistant d'accueil d'Explorer : guidé sans IA, trois questions maximum, en
 * plein écran, avec une sortie présente à chaque étape (la 4e carte, en
 * pointillé). Ne fait que composer un `AssistantOutcome` — c'est `Index.tsx`
 * qui applique les filtres.
 *
 * Miroir de `AssistantView` (iOS) / `AssistantScreen` (Android) : mêmes trois
 * questions, mêmes libellés, même arbre de décision.
 */
// Distance à parcourir vers le bas pour que le relâchement ferme l'écran,
// plutôt que d'y revenir — assez long pour ne jamais confondre un simple
// scroll de la liste avec une intention de fermer.
const DISMISS_DRAG_THRESHOLD = 140;

const Assistant = ({ open, catalogCount, kids, mealTypes, onFinish, onSkip }: AssistantProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('need');
  const [need, setNeed] = useState<Need | null>(null);
  const [ageBucket, setAgeBucket] = useState<Exclude<AgeBucket, 'all'> | null>(null);
  const [childSelection, setChildSelection] = useState<ChildFilterSelection | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragDownOffset, setDragDownOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep('need');
    setNeed(null);
    setAgeBucket(null);
    setChildSelection(null);
    setDragStart(null);
    setDragDownOffset(0);
    void recordAssistantOpened();
  }, [open]);

  if (!open) return null;

  // Sortie au doigt/à la souris, en plus de la 4e carte : l'écran plein cadre
  // n'a pas de fermeture native (contrairement à une feuille modale). Les
  // événements pointer bruts ne se disputent pas le scroll natif de la zone
  // `overflow-y-auto` en dessous — les deux fonctionnent en même temps,
  // comme le `Listener`/`simultaneousGesture` côté Android et iOS.
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    const dy = e.clientY - dragStart.y;
    const dx = e.clientX - dragStart.x;
    if (dy <= 0 || dy <= Math.abs(dx)) {
      if (dragDownOffset !== 0) setDragDownOffset(0);
      return;
    }
    setDragDownOffset(dy);
  };
  const handlePointerUp = () => {
    if (dragDownOffset > DISMISS_DRAG_THRESHOLD) {
      onSkip();
    } else if (dragDownOffset !== 0) {
      setDragDownOffset(0);
    }
    setDragStart(null);
  };

  const back = () => {
    if (step === 'context') {
      setAgeBucket(null);
      setChildSelection(null);
      setStep('who');
    } else if (step === 'who') {
      setNeed(null);
      setStep('need');
    }
  };

  const pickNeed = (n: Need) => {
    setNeed(n);
    setStep('who');
  };

  const finish = (extra: Partial<Pick<AssistantOutcome, 'weather' | 'duration' | 'mealId'>>) => {
    if (!need) return;
    void recordAssistantCompleted();
    onFinish({
      group: needGroup(need),
      category: needCategory(need),
      ageBucket,
      childSelection,
      weather: extra.weather ?? null,
      duration: extra.duration ?? null,
      mealId: extra.mealId ?? null,
    });
  };

  const childLabel = (child: Child): string => {
    const name = child.first_name?.trim();
    const bucket = bucketForChildMonths(ageInMonths(child));
    if (!name) return t(AGE_LABEL_KEY[bucket]);
    const months = ageInMonths(child);
    const age = months < 24
      ? t('common.age_in_months', { age: months })
      : t('common.age_in_years', { age: Math.round(months / 12) });
    return `${name} · ${age}`;
  };

  const stepIndexLabel = t(step === 'need' ? 'assistant.step_1' : step === 'who' ? 'assistant.step_2' : 'assistant.step_3');

  const question = step === 'need'
    ? t('assistant.question_need')
    : step === 'who'
      ? t('assistant.question_who')
      : need === 'manger'
        ? t('assistant.question_meal')
        : need === 'air'
          ? t('assistant.question_duration')
          : t('assistant.question_weather');

  const hint = step === 'need'
    ? t('assistant.hint_need')
    : step === 'who'
      ? t('assistant.hint_who')
      : need === 'manger'
        ? t('assistant.hint_meal')
        : need === 'air'
          ? t('assistant.hint_duration')
          : t('assistant.hint_weather');

  const escapeSubtitle = catalogCount && catalogCount > 0
    ? t('assistant.escape_subtitle_count', { count: catalogCount })
    : t('assistant.escape_subtitle_empty');

  const renderAnswers = () => {
    if (step === 'need') {
      return NEEDS.map((n) => (
        <ChoiceCard key={n.id} emoji={n.emoji} title={t(n.titleKey)} subtitle={t(n.subtitleKey)} onClick={() => pickNeed(n.id)} />
      ));
    }

    if (step === 'who') {
      if (kids.length === 0) {
        return AGE_BUCKET_CHOICES.map((bucket) => (
          <ChoiceCard
            key={bucket}
            title={t(AGE_LABEL_KEY[bucket])}
            onClick={() => {
              setAgeBucket(bucket);
              setChildSelection(null);
              setStep('context');
            }}
          />
        ));
      }
      return [
        ...kids.map((child) => (
          <ChoiceCard
            key={child.id}
            title={childLabel(child)}
            onClick={() => {
              setAgeBucket(bucketForChildMonths(ageInMonths(child)));
              setChildSelection({ kind: 'child', id: child.id });
              setStep('context');
            }}
          />
        )),
        ...(kids.length > 1
          ? [
              <ChoiceCard
                key="__all__"
                title={t('children.pill_all_mine')}
                onClick={() => {
                  setAgeBucket(null);
                  setChildSelection({ kind: 'allChildren' });
                  setStep('context');
                }}
              />,
            ]
          : []),
      ];
    }

    // step === 'context'
    if (need === 'manger') {
      if (mealTypes.length === 0) {
        return [
          <ChoiceCard key="none" emoji="🍽️" title={t('assistant.no_preference_title')} onClick={() => finish({})} />,
        ];
      }
      return mealTypes.map((meal) => (
        <ChoiceCard
          key={meal.id}
          emoji={meal.emoji}
          title={translateToken('meal', meal.label)}
          onClick={() => finish({ mealId: meal.id })}
        />
      ));
    }

    if (need === 'air') {
      return [
        <ChoiceCard key="1h" emoji="⏱️" title={t('assistant.duration_1h_title')} subtitle={t('assistant.duration_1h_subtitle')} onClick={() => finish({ duration: '1h' })} />,
        <ChoiceCard key="23h" emoji="🚲" title={t('assistant.duration_23h_title')} subtitle={t('assistant.duration_23h_subtitle')} onClick={() => finish({ duration: '2-3h' })} />,
        <ChoiceCard key="day" emoji="🧺" title={t('assistant.duration_day_title')} subtitle={t('assistant.duration_day_subtitle')} onClick={() => finish({ duration: 'Journée' })} />,
      ];
    }

    return [
      <ChoiceCard key="shelter" emoji="🏠" title={t('assistant.weather_shelter_title')} subtitle={t('assistant.weather_shelter_subtitle')} onClick={() => finish({ weather: 'Pluie' })} />,
      <ChoiceCard key="outside" emoji="☀️" title={t('assistant.weather_outside_title')} subtitle={t('assistant.weather_outside_subtitle')} onClick={() => finish({ weather: 'Soleil' })} />,
      <ChoiceCard key="any" emoji="🤷" title={t('assistant.no_preference_title')} subtitle={t('assistant.no_preference_subtitle')} onClick={() => finish({})} />,
    ];
  };

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        zIndex: 950,
        background: 'var(--bg)',
        transform: dragDownOffset ? `translateY(${dragDownOffset}px)` : undefined,
        transition: dragDownOffset ? 'none' : 'transform 180ms ease-out',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* En-tête : le logo se centre sur toute la largeur, le retour se pose
          par-dessus à gauche — sans largeur forcée le conteneur se réduirait
          au logo, et le retour n'existe qu'à partir de la 2e question. */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          width: '100%',
          padding: '10px 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {step !== 'need' && (
          <button
            type="button"
            onClick={back}
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--secondary)', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
            }}
          >
            <ChevronLeft size={18} />
            {t('assistant.back')}
          </button>
        )}
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>
          kidmapp
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 14 }}>
          <MascotteMedallion ariaLabel={t('assistant.mascotte_alt')} />
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', color: 'var(--text-muted)' }}>
          {stepIndexLabel}
        </p>

        <p style={{ textAlign: 'center', margin: '7px 16px 0', fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.24 }}>
          {question}
        </p>

        <p style={{ textAlign: 'center', margin: '2px 16px 0', fontFamily: 'Caveat, cursive', fontSize: 16, color: 'var(--text-muted)' }}>
          {hint}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '18px 16px 0' }}>
          {renderAnswers()}
        </div>

        {/* 4e carte, en pointillé — présente à chaque question, jamais en
            concurrence visuelle avec les vraies réponses. */}
        <div style={{ padding: '10px 16px 28px' }}>
          <button
            type="button"
            onClick={onSkip}
            className="text-left"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%',
              padding: '11px 13px',
              background: 'transparent',
              border: '1.5px dashed var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18, lineHeight: '22px' }}>🗺️</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, color: 'var(--secondary)' }}>
                {t('assistant.escape_title')}
              </span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
                {escapeSubtitle}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
