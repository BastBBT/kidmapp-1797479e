import { MapPin, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const isHome = location.pathname === '/';

  const truncatedEmail = user?.email
    ? user.email.length > 20
      ? user.email.slice(0, 18) + '…'
      : user.email
    : '';

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-14 px-4">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-extrabold text-foreground">
            Kid<span className="text-primary">map</span>
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              isHome ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Carte
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                location.pathname === '/admin' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Admin
            </button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[140px]">
            {truncatedEmail}
          </span>
          <button
            onClick={signOut}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
