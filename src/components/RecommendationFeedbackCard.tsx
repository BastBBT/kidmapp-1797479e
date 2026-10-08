import { useTranslation } from 'react-i18next';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useRecommendationFeedback, type FeedbackVerdict } from '@/hooks/useRecommendationFeedback';

type Props =
  | { locationId: string; isActivity: boolean; eventId?: never }
  | { eventId: string; locationId?: never; isActivity?: never };

/**
 * Carte « C'est pour vous ? » posée en bas des fiches détail : lieu/activité
 * au-dessus de l'invitation « Tu connais ce lieu ? », sortie sous « Ajouter à
 * mon calendrier ». Remplace les pouces retirés des cartes le 2026-10-07
 * (maquette C validée le 2026-10-08) — miroir de `RecommendationFeedbackCard`
 * (iOS / Android).
 *
 * Absente, jamais grisée, tant qu'aucun enfant n'est enregistré (`enabled`).
 * Ne pas la poser sur une sortie terminée : `EventFeedbackCard` (« Tu y
 * étais ? ») y tient ce rôle.
 */
const RecommendationFeedbackCard = (props: Props) => {
  const { t } = useTranslation();
  const feedback = useRecommendationFeedback();
  if (!feedback.enabled) return null;

  const verdict = props.locationId ? feedback.locationVerdict(props.locationId) : feedback.eventVerdict(props.eventId!);
  const title = props.eventId
    ? t('feedback.title_event')
    : props.isActivity
      ? t('feedback.title_activity')
      : t('feedback.title_place');

  const tap = (v: FeedbackVerdict) => {
    if (props.locationId) feedback.toggleLocation(props.locationId, v);
    else feedback.toggleEvent(props.eventId!, v);
  };

  const button = (target: FeedbackVerdict, Icon: typeof ThumbsUp, label: string, activeColor: string, activeBg: string) => {
    const isActive = verdict === target;
    return (
      <button
        type="button"
        onClick={() => tap(target)}
        aria-pressed={isActive}
        disabled={feedback.isSaving}
        style={{
          flex: 1,
          minWidth: 0,
          height: 44,
          borderRadius: 100,
          border: `1.5px solid ${isActive ? activeColor : 'var(--border)'}`,
          background: isActive ? activeBg : 'var(--surface)',
          color: isActive ? activeColor : 'var(--text)',
          opacity: feedback.isSaving ? 0.5 : 1,
          cursor: feedback.isSaving ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontFamily: 'DM Sans',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <Icon size={16} strokeWidth={2} fill={isActive ? 'currentColor' : 'none'} aria-hidden />
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontFamily: 'Fraunces', fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontFamily: 'DM Sans', fontSize: 13, lineHeight: 1.45, color: 'var(--text-muted)', marginTop: 2 }}>
          {t('feedback.subtitle')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {button('up', ThumbsUp, t('feedback.for_us'), 'var(--secondary)', 'var(--secondary-light)')}
        {button('down', ThumbsDown, t('feedback.not_for_us'), 'hsl(var(--destructive))', 'hsl(var(--destructive) / 0.08)')}
      </div>
      {verdict && (
        <div role="status" style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          {t('feedback.noted')}
        </div>
      )}
    </div>
  );
};

export default RecommendationFeedbackCard;
