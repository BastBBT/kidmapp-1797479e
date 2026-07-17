import { useNavigate, useLocation } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { useProposalModal } from '@/hooks/useProposalModal';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const tabs = [
  {
    id: 'explore',
    label: 'EXPLORER',
    path: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    id: 'sorties',
    label: 'SORTIES',
    path: '/sorties',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'saved',
    label: 'SAUVEGARDÉS',
    path: '/saved',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    id: 'account',
    label: 'MON COMPTE',
    path: '/account',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { favoriteIds } = useFavorites();
  const { open: openProposal } = useProposalModal();
  const { requireAuth } = useRequireAuth();

  const handleProposeClick = () => {
    requireAuth(() => openProposal(), {
      message: 'Connecte-toi pour proposer un nouveau lieu à la communauté ✦',
    });
  };

  const renderTab = (tab: typeof tabs[number]) => {
    const isActive = location.pathname === tab.path;
    return (
      <button
        key={tab.id}
        onClick={() => navigate(tab.path)}
        className="relative flex flex-col items-center gap-0.5 px-4 py-1 transition-colors"
        style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}
      >
        <div className="relative">
          {tab.icon}
          {tab.id === 'saved' && favoriteIds.length > 0 && (
            <span
              className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1"
              style={{ background: '#D95F3B' }}
            >
              {favoriteIds.length}
            </span>
          )}
        </div>
        <span className="font-body text-[10px] uppercase font-semibold tracking-wide">
          {tab.label}
        </span>
      </button>
    );
  };

  const exploreTab = tabs.find((t) => t.id === 'explore')!;
  const savedTab = tabs.find((t) => t.id === 'saved')!;
  const accountTab = tabs.find((t) => t.id === 'account')!;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: '24px',
        paddingTop: '8px',
      }}
    >
      {renderTab(exploreTab)}

      {/* Bouton Proposer — action, pas une route */}
      <button
        onClick={handleProposeClick}
        className="relative flex flex-col items-center gap-1 px-3 py-1 transition-transform active:scale-95"
        aria-label="Proposer un lieu"
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            background: '#D95F3B',
            width: 36,
            height: 36,
            boxShadow: '0 4px 12px rgba(217, 95, 59, 0.35)',
            color: '#fff',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span
          className="font-body text-[10px] uppercase font-semibold tracking-wide"
          style={{ color: '#D95F3B' }}
        >
          PROPOSER
        </span>
      </button>

      {renderTab(savedTab)}
      {renderTab(accountTab)}
    </nav>
  );
};

export default BottomNav;
