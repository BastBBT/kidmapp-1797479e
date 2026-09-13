import { useTranslation } from 'react-i18next';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { FeedbackVerdict } from '@/hooks/useRecommendationFeedback';

interface Props {
  verdict: FeedbackVerdict | undefined;
  onTap: (verdict: FeedbackVerdict) => void;
  /** Verrouille les deux boutons le temps d'un enregistrement : deux taps
   *  concurrents sur la même cible y créeraient deux lignes. */
  isSaving?: boolean;
}

/**
 * Ligne d'icônes compactes du feedback par item. Volontairement sans libellé :
 * la carte grille des lieux (2 colonnes) n'a pas la place du texte de la
 * maquette d'origine — l'intitulé vit dans l'`aria-label`.
 */
const FeedbackIconsRow = ({ verdict, onTap, isSaving = false }: Props) => {
  const { t } = useTranslation();

  const button = (target: FeedbackVerdict, Icon: typeof ThumbsUp, activeColor: string, label: string) => {
    const isActive = verdict === target;
    return (
      <button
        type="button"
        onClick={(e) => {
          // La racine de la carte navigue au clic : sans ça, un pouce
          // ouvrirait la fiche en même temps qu'il enregistre l'avis.
          e.stopPropagation();
          onTap(target);
        }}
        aria-label={label}
        aria-pressed={isActive}
        disabled={isSaving}
        style={{
          opacity: isSaving ? 0.5 : 1,
          width: 26, height: 26, padding: 0, borderRadius: '50%',
          border: 'none', background: 'transparent', cursor: isSaving ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: isActive ? activeColor : 'var(--text-muted)',
        }}
      >
        <Icon size={14} strokeWidth={2} fill={isActive ? 'currentColor' : 'none'} />
      </button>
    );
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {button('up', ThumbsUp, 'var(--secondary)', t('feedback.up'))}
      {button('down', ThumbsDown, 'hsl(var(--destructive))', t('feedback.down'))}
    </div>
  );
};

export default FeedbackIconsRow;
