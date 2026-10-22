import { useTranslation } from 'react-i18next';
import { MascotteMiniature } from '@/components/Mascotte';

/**
 * Point d'entrée de l'assistant, identique sur Explorer et Sorties : la même
 * pastille ouvre, selon la page, l'assistant des lieux ou celui des sorties.
 * Miroir de `AssistantButton` (iOS, Android).
 */
const AssistantButton = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('assistant.open')}
      className="flex items-center cursor-pointer"
      style={{
        gap: 6,
        padding: '4px 12px 4px 4px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        fontFamily: 'DM Sans',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--secondary)',
      }}
    >
      <MascotteMiniature size={30} />
      {t('sorties.help_me')}
    </button>
  );
};

export default AssistantButton;
