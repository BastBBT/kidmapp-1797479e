import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const AuthModal = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        toast({ title: 'Compte créé ! 🎉', description: 'Vous êtes maintenant connecté.' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Une erreur est survenue';
      const mapped: Record<string, string> = {
        'Invalid login credentials': 'Email ou mot de passe incorrect.',
        'User already registered': 'Cet email est déjà utilisé.',
        'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères.',
      };
      toast({ title: 'Erreur', description: mapped[msg] || msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="font-display text-4xl font-semibold" style={{ color: 'var(--primary)' }}>
            kidmap
          </h1>
          <p className="font-hand text-base mt-1" style={{ color: 'var(--text-muted)' }}>
            Trouvez les meilleurs endroits kid-friendly à Nantes
          </p>
        </div>

        {/* Toggle */}
        <div className="flex p-1 mb-6" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '100px' }}>
          <button
            onClick={() => setMode('login')}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={{
              borderRadius: '100px',
              background: mode === 'login' ? 'var(--surface)' : 'transparent',
              boxShadow: mode === 'login' ? 'var(--shadow)' : 'none',
              color: mode === 'login' ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            Se connecter
          </button>
          <button
            onClick={() => setMode('signup')}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={{
              borderRadius: '100px',
              background: mode === 'signup' ? 'var(--surface)' : 'transparent',
              boxShadow: mode === 'signup' ? 'var(--shadow)' : 'none',
              color: mode === 'signup' ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            Créer un compte
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              className="h-12"
              style={{ borderRadius: 'var(--radius-sm)', background: 'var(--surface)', borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="h-12"
              style={{ borderRadius: 'var(--radius-sm)', background: 'var(--surface)', borderColor: 'var(--border)' }}
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Confirmer le mot de passe</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-12"
                style={{ borderRadius: 'var(--radius-sm)', background: 'var(--surface)', borderColor: 'var(--border)' }}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 font-semibold text-sm mt-2 disabled:opacity-40 transition-opacity flex items-center justify-center"
            style={{ borderRadius: '100px', background: 'var(--primary)', color: '#fff' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
