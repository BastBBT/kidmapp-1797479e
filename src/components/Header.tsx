import { LogOut, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import CategoryFilter from '@/components/CategoryFilter';
import { LocationCategory } from '@/types/location';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
  selectedCategory?: LocationCategory | 'all';
  onCategoryChange?: (cat: LocationCategory | 'all') => void;
}

const Header = ({ onSearch, searchValue, selectedCategory, onCategoryChange }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="container px-4">
        {/* Row 1 — Logo + avatar */}
        <div className="flex items-center justify-between h-14">
          <div className="flex flex-col cursor-pointer leading-none" onClick={() => navigate('/')}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', color: 'var(--primary)', letterSpacing: '-0.03em', fontWeight: 600 }}>
              kidmapp
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

        {/* Row 2 — Search bar */}
        {onSearch && (
          <div className="relative pb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)', marginTop: '-6px' }} />
            <input
              type="text"
              placeholder="Rechercher un lieu…"
              value={searchValue ?? ''}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm outline-none transition-colors"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
          </div>
        )}

        {/* Row 3 — Category filter */}
        {selectedCategory !== undefined && onCategoryChange && (
          <div className="pb-3">
            <CategoryFilter selected={selectedCategory} onChange={onCategoryChange} />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
