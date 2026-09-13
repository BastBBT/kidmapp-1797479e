import { useTranslation } from 'react-i18next';
import { useChildren } from '@/hooks/useChildren';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1650,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
};

const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 480, background: 'var(--surface)',
  borderRadius: '24px 24px 0 0',
  padding: '10px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
  animation: 'slideUp 0.3s ease', textAlign: 'center',
};

/**
 * Écran 2 — hook de capture. Proposé au premier usage de la barre d'âge
 * générique tant qu'aucun enfant n'est enregistré. Le filtre choisi s'applique
 * immédiatement quoi qu'il arrive ici : cette feuille ne bloque rien, elle
 * propose. Toute sortie sans passer par « Enregistrer mes enfants » (bouton
 * « Plus tard », clic sur le fond) relance le verrou de 30 jours.
 */
const ChildrenCaptureHookSheet = () => {
  const { t } = useTranslation();
  const { wantsHookSheet, closeHookSheet, openCaptureFlow } = useChildren();
  const { requireAuth } = useRequireAuth();

  if (!wantsHookSheet) return null;

  const register = () => {
    closeHookSheet(true);
    // `requireAuth` rejoue l'action après connexion : le formulaire de saisie
    // s'ouvre tout seul au retour de l'auth, sans redemander le geste.
    requireAuth(() => openCaptureFlow(), { message: t('children.hook_auth_message') });
  };

  return (
    <div onClick={() => closeHookSheet(false)} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 22px' }} />

        <div style={{ fontSize: 34, lineHeight: 1 }}>🧡</div>

        <div style={{ fontFamily: 'Fraunces', fontSize: 19, fontWeight: 500, color: 'var(--text)', marginTop: 12 }}>
          {t('children.hook_title')}
        </div>
        <p style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', margin: '6px auto 0', maxWidth: 300 }}>
          {t('children.hook_subtitle')}
        </p>

        <button
          onClick={register}
          style={{
            width: '100%', padding: 15, borderRadius: 14, marginTop: 24,
            border: 'none', background: 'var(--primary)', color: '#fff',
            fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('children.hook_register')}
        </button>

        <button
          onClick={() => closeHookSheet(false)}
          style={{
            width: '100%', padding: '12px 0 0', background: 'transparent', border: 'none',
            color: 'var(--text-muted)', fontFamily: 'DM Sans', fontSize: 14, cursor: 'pointer',
          }}
        >
          {t('children.capture_later')}
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
};

export default ChildrenCaptureHookSheet;
