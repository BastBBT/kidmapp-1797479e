import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AuthModal = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const mapped: Record<string, string> = {
        'Invalid login credentials': 'Email ou mot de passe incorrect',
        'User already registered': 'Cet email est déjà utilisé',
        'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
      };
      setError(mapped[msg] || msg || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    fontFamily: 'DM Sans',
    fontSize: '14px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <div
        style={{
          height: 300,
          flexShrink: 0,
          background: 'linear-gradient(160deg, #FAF0EC 0%, #F0C4B4 60%, #E8A088 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Blobs */}
        <svg style={{ position: 'absolute', top: '-30px', right: '-40px', width: '220px', height: '220px' }} viewBox="0 0 220 220">
          <path d="M110,20 C155,15 200,55 210,100 C220,145 190,190 145,205 C100,220 50,200 25,160 C0,120 10,65 50,40 C70,27 85,22 110,20Z" fill="rgba(255,255,255,0.15)" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '-20px', left: '-30px', width: '160px', height: '160px' }} viewBox="0 0 160 160">
          <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.12)" />
        </svg>
        <svg style={{ position: 'absolute', top: '60px', left: '30px', width: '80px', height: '80px' }} viewBox="0 0 80 80">
          <path d="M40,5 C58,4 74,18 77,36 C80,54 68,70 50,76 C32,82 13,72 6,54 C-1,36 8,15 25,7 C31,4 35,5 40,5Z" fill="rgba(255,255,255,0.10)" />
        </svg>

        {/* Logo */}
        <div style={{ fontFamily: 'Fraunces', fontSize: '48px', color: 'var(--primary)', letterSpacing: '-0.04em', fontWeight: 500, position: 'relative', zIndex: 1 }}>
          kidmap
        </div>
        <div style={{ fontFamily: 'Caveat', fontSize: '18px', color: '#C45A38', fontWeight: 500, position: 'relative', zIndex: 1 }}>
          Nantes pour les familles ✦
        </div>

        {/* Category icons */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, position: 'relative', zIndex: 1 }}>
          {[
            { stroke: '#D95F3B', paths: [<path key="1" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />, <path key="2" d="M7 2v20" />, <path key="3" d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z" />, <path key="4" d="M21 15v7" />] },
            { stroke: '#3B7D6E', paths: [<path key="1" d="M18 8h1a4 4 0 010 8h-1" />, <path key="2" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />] },
            { stroke: '#5A9A56', paths: [<path key="1" d="M12 22V12" />, <path key="2" d="M8 12c0 0-4-2.5-4-6a8 8 0 0116 0c0 3.5-4 6-4 6" />] },
            { stroke: '#C49A35', paths: [<path key="1" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />, <line key="2" x1="3" y1="6" x2="21" y2="6" />, <path key="3" d="M16 10a4 4 0 01-8 0" />] },
          ].map((icon, i) => (
            <div
              key={i}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.75)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={icon.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon.paths}
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Form zone */}
      <div style={{ flex: 1, padding: '28px 24px 40px', background: 'var(--bg)' }}>
        {/* Toggle */}
        <div
          style={{
            display: 'flex',
            padding: 4,
            border: '1.5px solid var(--border)',
            borderRadius: '100px',
            background: 'var(--bg)',
            marginBottom: 24,
          }}
        >
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: '100px',
                fontFamily: 'DM Sans',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {m === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          ))}
        </div>

        {/* Title */}
        <div style={{ fontFamily: 'Fraunces', fontSize: '26px', fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
          {mode === 'login' ? 'Bienvenue 👋' : 'Créer un compte'}
        </div>
        <div style={{ fontFamily: 'DM Sans', fontSize: '14px', color: 'var(--text-muted)', marginBottom: 28 }}>
          {mode === 'login'
            ? 'Connectez-vous pour découvrir les meilleurs endroits kid-friendly'
            : 'Rejoignez la communauté de parents nantais'}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label style={{ fontFamily: 'DM Sans', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '100px',
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
              transition: 'opacity 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? mode === 'login' ? 'Connexion…' : 'Création…'
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          {error && (
            <div style={{ fontFamily: 'DM Sans', fontSize: '13px', color: 'var(--primary)', textAlign: 'center', marginTop: 4 }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
