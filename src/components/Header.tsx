import { LogOut, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ background: 'rgba(250,249,246,0.85)', borderColor: 'var(--border)' }}>
      <div className="container flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex flex-col cursor-pointer leading-none" onClick={() => navigate('/')}>
          <span className="font-display text-xl font-semibold" style={{ color: 'var(--primary)' }}>
            kidmap
          </span>
          <span className="font-hand text-xs" style={{ color: 'var(--text-muted)' }}>
            — Nantes
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: location.pathname === '/admin' ? 'var(--primary)' : 'transparent',
                color: location.pathname === '/admin' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Admin
            </button>
          )}

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            title={user?.email ?? ''}
          >
            {initial}
          </div>

          <button
            onClick={signOut}
            className="p-2 rounded-full transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
