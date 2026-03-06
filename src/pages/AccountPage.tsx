import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User, Mail } from 'lucide-react';

const AccountPage = () => {
  const { user, signOut } = useAuth();

  const initial = user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>
      <div className="px-5 pt-14 pb-6">
        <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>
          Mon compte
        </h1>
      </div>

      <div className="flex flex-col items-center px-5 py-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--primary-light)' }}
        >
          <span className="font-display text-2xl font-semibold" style={{ color: 'var(--primary)' }}>
            {initial}
          </span>
        </div>

        <div
          className="w-full rounded-2xl p-5 mt-4"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <Mail className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="font-body text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Email</p>
              <p className="font-body text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-3">
            <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <div>
              <p className="font-body text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Membre depuis</p>
              <p className="font-body text-sm font-medium" style={{ color: 'var(--text)' }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-8 gap-2"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  );
};

export default AccountPage;
