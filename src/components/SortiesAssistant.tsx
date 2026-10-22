import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Square, SquareCheck, X } from 'lucide-react';
import { AGE_LABEL_KEY, ChildAgeBucket, bucketForChildMonths } from '@/lib/ageFilter';
import { Child, ChildFilterSelection, ageInMonths } from '@/lib/children';
import { recordAssistantCompleted, recordAssistantOpened } from '@/lib/assistantUsageTracker';
import { MascotteMedallion } from '@/components/Mascotte';
import { localeOf } from '@/lib/formatDate';
import { dateFromISO } from '@/lib/eventCalendar';
import { whenDays, type DayMoment, type EventCriteria, type SortiesWhen } from '@/lib/sortiesFilters';

/**
 * Ce que l'assistant de Sorties pose comme filtres. Chaque champ correspond à
 * un filtre visible et défaisable dans la barre de Sorties.
 * Miroir de `SortiesAssistantOutcome` (iOS, Android).
 */
export interface SortiesAssistantOutcome {
  when: SortiesWhen;
  ageBuckets: Set<ChildAgeBucket>;
  /** Quand le profil famille existe, c'est elle qui pilote le filtre d'âge. */
  childSelection: ChildFilterSelection | null;
  categories: Set<string>;
  moments: Set<DayMoment>;
  onlyFree: boolean;
  onlyNearby: boolean;
}

type Step = 'when' | 'who' | 'kind' | 'extras';

const blank = (): SortiesAssistantOutcome => ({
  when: { kind: 'today' },
  ageBuckets: new Set(),
  childSelection: null,
  categories: new Set(),
  moments: new Set(),
  onlyFree: false,
  onlyNearby: false,
});

const outcomeCriteria = (o: SortiesAssistantOutcome): EventCriteria => ({
  days: whenDays(o.when),
  ageBuckets: o.ageBuckets,
  categories: o.categories,
  moments: o.moments,
  onlyFree: o.onlyFree,
  onlyNearby: o.onlyNearby,
});

const AGE_BUCKET_CHOICES: ChildAgeBucket[] = ['0-2', '3-5', '6+'];

interface Props {
  open: boolean;
  kids: Child[];
  /** Nombre de sorties pour des critères donnés, calculé sur le vrai catalogue. */
  count: (c: EventCriteria) => number;
  onFinish: (outcome: SortiesAssistantOutcome) => void;
  onSkip: () => void;
}

const cardStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '12px 13px',
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer',
};

interface ChoiceCardProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  count: number;
  ariaLabel: string;
  onClick: () => void;
}

/** Carte de réponse, avec à droite le nombre de sorties qu'elle laisse. */
const ChoiceCard = ({ emoji, title, subtitle, count, ariaLabel, onClick }: ChoiceCardProps) => (
  <button type="button" onClick={onClick} className="text-left" style={cardStyle} aria-label={ariaLabel}>
    {emoji && <span style={{ fontSize: 19 }}>{emoji}</span>}
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      {subtitle && <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</span>}
    </span>
    <span
      style={{
        fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 8px',
        color: count === 0 ? 'var(--text-muted)' : 'var(--secondary)', background: count === 0 ? 'var(--bg)' : 'var(--secondary-light)',
      }}
    >
      {count}
    </span>
  </button>
);

interface ToggleCardProps {
  title: string;
  subtitle: string;
  checked: boolean;
  onClick: () => void;
}

const ToggleCard = ({ title, subtitle, checked, onClick }: ToggleCardProps) => (
  <button
    type="button" role="checkbox" aria-checked={checked} onClick={onClick} className="text-left"
    style={{
      ...cardStyle,
      background: checked ? 'var(--secondary-light)' : 'var(--surface)',
      border: `${checked ? 1.5 : 1}px solid ${checked ? 'var(--secondary)' : 'var(--border)'}`,
    }}
  >
    <span style={{ color: checked ? 'var(--secondary)' : 'var(--text-muted)', display: 'flex' }}>
      {checked ? <SquareCheck size={20} aria-hidden /> : <Square size={20} aria-hidden />}
    </span>
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</span>
    </span>
  </button>
);

/**
 * Assistant de Sorties : quand, pour qui, quoi, puis des précisions
 * facultatives. Pas de question météo, contrairement à Explorer : presque
 * toutes les sorties se tiennent en intérieur, la question ne trierait rien.
 * Chaque réponse affiche le nombre de sorties qu'elle laisse.
 * Miroir de `SortiesAssistantView` (iOS) / `SortiesAssistantScreen` (Android).
 */
const SortiesAssistant = ({ open, kids, count, onFinish, onSkip }: Props) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>('when');
  const [draft, setDraft] = useState<SortiesAssistantOutcome>(blank);

  useEffect(() => {
    if (!open) return;
    setStep('when');
    setDraft(blank());
    void recordAssistantOpened();
  }, [open]);

  if (!open) return null;

  const n = (o: SortiesAssistantOutcome) => count(outcomeCriteria(o));

  const go = (next: Step, o: SortiesAssistantOutcome) => {
    setDraft(o);
    setStep(next);
  };

  const back = () => {
    if (step === 'extras') {
      setDraft({ ...draft, moments: new Set(), onlyFree: false, onlyNearby: false });
      setStep('kind');
    } else if (step === 'kind') {
      setDraft({ ...draft, categories: new Set(), ageBuckets: new Set(), childSelection: null });
      setStep('who');
    } else if (step === 'who') {
      setStep('when');
    }
  };

  const finish = () => {
    void recordAssistantCompleted();
    onFinish(draft);
  };

  const fmt = (iso: string) => {
    const s = dateFromISO(iso).toLocaleDateString(localeOf(i18n.language), { weekday: 'long', day: 'numeric', month: 'long' });
    return s;
  };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const daysLabel = (when: SortiesWhen) => {
    const days = whenDays(when);
    if (days.length === 1) return cap(fmt(days[0]));
    return cap(t('sorties_assistant.from_to', { start: fmt(days[0]), end: fmt(days[days.length - 1]) }));
  };

  const childLabel = (child: Child): string => {
    const name = child.first_name?.trim();
    const months = ageInMonths(child);
    if (!name) return t(AGE_LABEL_KEY[bucketForChildMonths(months)]);
    const age = months < 24 ? t('common.age_in_months', { age: months }) : t('common.age_in_years', { age: Math.round(months / 12) });
    return `${name} · ${age}`;
  };

  const choice = (key: string, title: string, next: SortiesAssistantOutcome, to: Step, emoji?: string, subtitle?: string) => {
    const c = n(next);
    return (
      <ChoiceCard
        key={key}
        emoji={emoji}
        title={title}
        subtitle={subtitle}
        count={c}
        ariaLabel={`${title}, ${t('sorties.total', { count: c })}`}
        onClick={() => go(to, next)}
      />
    );
  };

  const label = (key: string) => (
    <p style={{ fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', color: 'var(--text-muted)', margin: '4px 0 0' }}>
      {t(key)}
    </p>
  );

  const momentButton = (moment: DayMoment | null, text: string) => {
    const on = moment === null ? draft.moments.size === 0 : draft.moments.size === 1 && draft.moments.has(moment);
    return (
      <button
        key={moment ?? 'any'}
        type="button"
        aria-pressed={on}
        onClick={() => setDraft({ ...draft, moments: moment === null ? new Set() : new Set([moment]) })}
        style={{
          flex: 1, minHeight: 44, borderRadius: 12, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500,
          background: on ? 'var(--secondary-light)' : 'var(--surface)',
          border: `${on ? 1.5 : 1}px solid ${on ? 'var(--secondary)' : 'var(--border)'}`,
          color: on ? 'var(--text)' : 'var(--text-muted)',
        }}
      >
        {text}
      </button>
    );
  };

  const renderAnswers = () => {
    switch (step) {
      case 'when':
        return ([
          [{ kind: 'today' }, '☀️', 'sorties.period_today'],
          [{ kind: 'tomorrow' }, '🌙', 'sorties.period_tomorrow'],
          [{ kind: 'weekend' }, '🎈', 'sorties.period_weekend'],
          [{ kind: 'week' }, '🗓️', 'sorties.period_week'],
        ] as [SortiesWhen, string, string][]).map(([when, emoji, key]) =>
          choice(key, t(key), { ...draft, when }, 'who', emoji, daysLabel(when)),
        );
      case 'who':
        if (kids.length === 0) {
          return AGE_BUCKET_CHOICES.map((bucket) =>
            choice(bucket, t(AGE_LABEL_KEY[bucket]), { ...draft, ageBuckets: new Set([bucket]), childSelection: null }, 'kind'),
          );
        }
        return [
          ...kids.map((child) =>
            choice(
              child.id,
              childLabel(child),
              { ...draft, ageBuckets: new Set([bucketForChildMonths(ageInMonths(child))]), childSelection: { kind: 'child', id: child.id } },
              'kind',
            ),
          ),
          ...(kids.length > 1
            ? [
                choice(
                  '__all__',
                  t('children.pill_all_mine'),
                  {
                    ...draft,
                    ageBuckets: new Set(kids.map((k) => bucketForChildMonths(ageInMonths(k)))),
                    childSelection: { kind: 'allChildren' },
                  },
                  'kind',
                  undefined,
                  t('sorties_assistant.all_kids_sub'),
                ),
              ]
            : []),
        ];
      case 'kind':
        return [
          choice('s', t('sorties_assistant.spectacle'), { ...draft, categories: new Set(['Spectacle']) }, 'extras', '🎭', t('sorties_assistant.spectacle_sub')),
          choice('a', t('sorties_assistant.atelier'), { ...draft, categories: new Set(['Atelier']) }, 'extras', '🎨', t('sorties_assistant.atelier_sub')),
          choice('x', t('assistant.no_preference_title'), { ...draft, categories: new Set() }, 'extras', '🤷', t('assistant.no_preference_subtitle')),
        ];
      case 'extras': {
        const total = n(draft);
        return [
          <div key="m" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {label('sorties_assistant.rather')}
            <div style={{ display: 'flex', gap: 6 }}>
              {momentButton('matin', t('sorties.moment_matin'))}
              {momentButton('apresMidi', t('sorties.moment_apresMidi'))}
              {momentButton(null, t('assistant.no_preference_title'))}
            </div>
            {label('sorties_assistant.also')}
          </div>,
          <ToggleCard key="f" title={t('assistant.free_only_title')} subtitle={t('sorties_assistant.free_sub')} checked={draft.onlyFree} onClick={() => setDraft({ ...draft, onlyFree: !draft.onlyFree })} />,
          <ToggleCard key="n" title={t('sorties_assistant.near')} subtitle={t('sorties_assistant.near_sub')} checked={draft.onlyNearby} onClick={() => setDraft({ ...draft, onlyNearby: !draft.onlyNearby })} />,
          <button
            key="go"
            type="button"
            onClick={finish}
            style={{
              width: '100%', minHeight: 50, marginTop: 6, border: 'none', cursor: 'pointer',
              background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius)',
              fontFamily: 'DM Sans', fontSize: 15, fontWeight: 600,
            }}
          >
            {total === 0 ? t('sorties_assistant.cta_none') : t('sorties.cta_see', { count: total })}
          </button>,
        ];
      }
    }
  };

  const question = { when: 'sorties_assistant.question_when', who: 'assistant.question_who', kind: 'sorties_assistant.question_kind', extras: 'assistant.question_extras' }[step];
  const hint = { when: 'sorties_assistant.hint_when', who: 'sorties_assistant.hint_who', kind: 'sorties_assistant.hint_kind', extras: 'assistant.hint_extras' }[step];
  const stepIndex = { when: 1, who: 2, kind: 3, extras: 4 }[step];
  const all = count({ days: whenDays({ kind: 'week' }), ageBuckets: new Set(), categories: new Set(), moments: new Set(), onlyFree: false, onlyNearby: false });

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 950, background: 'var(--bg)' }} role="dialog" aria-modal="true">
      <div
        style={{
          position: 'relative', flexShrink: 0, width: '100%', minHeight: 52, padding: '0 8px',
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {step !== 'when' && (
          <button
            type="button"
            onClick={back}
            style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', minHeight: 44, padding: '0 8px',
              display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--secondary)', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600,
            }}
          >
            <ChevronLeft size={18} />
            {t('assistant.back')}
          </button>
        )}
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: 'var(--primary)' }}>kidmapp</span>
        <button
          type="button"
          onClick={onSkip}
          aria-label={t('common.close')}
          style={{
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 14 }}>
          <MascotteMedallion ariaLabel={t('assistant.mascotte_alt')} />
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'DM Sans', fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', color: 'var(--text-muted)' }}>
          {t(`assistant.step_${stepIndex}`)}
        </p>
        <p style={{ textAlign: 'center', margin: '7px 16px 0', fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.24 }}>
          {t(question)}
        </p>
        <p style={{ textAlign: 'center', margin: '2px 16px 0', fontFamily: 'Caveat, cursive', fontSize: 16, color: 'var(--text-muted)' }}>
          {t(hint)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '18px 16px 0' }}>{renderAnswers()}</div>
        <div style={{ padding: '10px 16px 28px' }}>
          <button
            type="button"
            onClick={onSkip}
            className="text-left"
            style={{ ...cardStyle, background: 'transparent', border: '1.5px dashed var(--border)' }}
          >
            <span style={{ fontSize: 18 }}>📅</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, color: 'var(--secondary)' }}>{t('assistant.escape_title')}</span>
              <span style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>
                {all > 0 ? t('sorties_assistant.escape_count', { count: all }) : t('sorties_assistant.escape_all')}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortiesAssistant;
