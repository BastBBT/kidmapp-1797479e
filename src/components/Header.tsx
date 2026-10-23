import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AssistantButton from '@/components/AssistantButton';


interface HeaderProps {
  /** Rouvre l'assistant mascotte à la demande — seul moyen de le relancer une
   *  fois la journée entamée, puisqu'il ne s'ouvre de lui-même qu'une fois
   *  par jour. Absent = pas d'icône (pages autres qu'Explorer). */
  onOpenAssistant?: () => void;
}

const Header = ({ onOpenAssistant }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="container px-4">
        {/* Row 1 — Logo + avatar */}
        <div className="flex items-center justify-between h-14">
          <div className="flex flex-col cursor-pointer leading-none" onClick={() => navigate('/')}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', color: 'var(--primary)', letterSpacing: '-0.03em', fontWeight: 600 }}>
              Kidmapp
            </span>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: '14px', color: 'var(--text-muted)' }}>
              — Nantes
            </span>
          </div>

          <nav className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/gestion-k1dm4p')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: location.pathname === '/gestion-k1dm4p' ? 'var(--primary)' : 'transparent',
                  color: location.pathname === '/gestion-k1dm4p' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Admin
              </button>
            )}

            {/* Uniquement la bulle de l'assistant et son texte : l'avatar
                (lettre du compte) faisait doublon avec l'onglet compte de la
                barre du bas et encombrait le coin sans raison d'y être. */}
            {/* Même pastille sur Explorer et Sorties : un seul geste à apprendre,
                chaque page ouvrant ensuite son propre assistant. */}
            {onOpenAssistant && <AssistantButton onClick={onOpenAssistant} />}
          </nav>
        </div>

      </div>


    </header>
  );
};

export default Header;
