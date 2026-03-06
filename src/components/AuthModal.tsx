import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
        toast({
          title: 'Compte créé ! 🎉',
          description: 'Vérifiez votre email pour confirmer votre inscription.',
        });
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 kid-shadow">
            <MapPin className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">
            Kid<span className="text-primary">map</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Trouvez les meilleurs endroits kid-friendly à Nantes
          </p>
        </div>

        {/* Toggle */}
        <div className="flex bg-muted rounded-2xl p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              mode === 'login' ? 'bg-card text-foreground kid-shadow' : 'text-muted-foreground'
            }`}
          >
            Se connecter
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              mode === 'signup' ? 'bg-card text-foreground kid-shadow' : 'text-muted-foreground'
            }`}
          >
            Créer un compte
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              className="rounded-xl h-12 bg-card border-border"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="rounded-xl h-12 bg-card border-border"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confirmer le mot de passe</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="rounded-xl h-12 bg-card border-border"
              />
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl font-bold text-sm mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              'Se connecter'
            ) : (
              'Créer mon compte'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
