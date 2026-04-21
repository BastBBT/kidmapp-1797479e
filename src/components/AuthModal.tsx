import { useState, useEffect } from 'react';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AuthModalProps {
  initialMode?: 'login' | 'signup';
}

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const ForgotPasswordSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setEmail('');
      setSuccess(false);
      setError('');
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 24px calc(env(safe-area-inset-bottom, 0px) + 28px)',
          animation: 'slideUp 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>
            Réinitialiser le mot de passe
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
        </div>

        {success ? (
          <>
            <div
              style={{
                background: 'hsl(var(--success) / 0.1)',
                border: '1px solid hsl(var(--success) / 0.3)',
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 18,
              }}
            >
              <CheckCircle2 size={20} style={{ color: 'hsl(var(--success))', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Pense à vérifier tes spams.
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 100,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontFamily: 'DM Sans',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 0, marginBottom: 18 }}>
              Entre ton email et nous t'enverrons un lien pour créer un nouveau mot de passe.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontFamily: 'DM Sans',
                fontSize: 14,
                color: 'var(--text)',
                outline: 'none',
                marginBottom: 14,
              }}
            />
            {error && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--primary)', marginBottom: 12 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 15,
                borderRadius: 100,
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'DM Sans',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
};

const AuthModal = ({ initialMode = 'signup' }: AuthModalProps) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    setError('');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password);
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
    borderRadius: 12,
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Hero (~28vh) */}
      <div
        style={{
          height: '28vh',
          minHeight: 220,
          maxHeight: 290,
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
        <svg style={{ position: 'absolute', top: '-30px', right: '-40px', width: 220, height: 220 }} viewBox="0 0 220 220">
          <path d="M110,20 C155,15 200,55 210,100 C220,145 190,190 145,205 C100,220 50,200 25,160 C0,120 10,65 50,40 C70,27 85,22 110,20Z" fill="rgba(255,255,255,0.15)" />
        </svg>
        <svg style={{ position: 'absolute', bottom: '-20px', left: '-30px', width: 160, height: 160 }} viewBox="0 0 160 160">
          <path d="M80,10 C115,8 148,35 155,70 C162,105 145,140 112,152 C79,164 42,150 22,120 C2,90 8,50 35,28 C52,14 62,11 80,10Z" fill="rgba(255,255,255,0.12)" />
        </svg>

        <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 700, fontSize: 46, color: 'var(--primary)', letterSpacing: '-0.04em', position: 'relative', zIndex: 1, lineHeight: 1 }}>
          kidmapp
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: '#C45A38', fontWeight: 500, position: 'relative', zIndex: 1, marginTop: 4 }}>
          Nantes pour les familles ✦
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14, position: 'relative', zIndex: 1 }}>
          {[
            { stroke: '#D95F3B', paths: [<path key="1" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />, <path key="2" d="M7 2v20" />, <path key="3" d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z" />, <path key="4" d="M21 15v7" />] },
            { stroke: '#3B7D6E', paths: [<path key="1" d="M18 8h1a4 4 0 010 8h-1" />, <path key="2" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />] },
            { stroke: '#5A9A56', paths: [<path key="1" d="M12 22V12" />, <path key="2" d="M8 12c0 0-4-2.5-4-6a8 8 0 0116 0c0 3.5-4 6-4 6" />] },
            { stroke: '#C49A35', paths: [<path key="1" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />, <line key="2" x1="3" y1="6" x2="21" y2="6" />, <path key="3" d="M16 10a4 4 0 01-8 0" />] },
          ].map((icon, i) => (
            <div
              key={i}
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.78)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={icon.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon.paths}
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Sheet */}
      <div
        style={{
          flex: 1,
          marginTop: -24,
          background: 'var(--bg)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Underline tabs - centered */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 36, borderBottom: '1.5px solid var(--border)', marginBottom: 18 }}>
          {(['signup', 'login'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  position: 'relative',
                  padding: '0 0 12px',
                  border: 'none',
                  background: 'transparent',
                  fontFamily: 'DM Sans',
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  opacity: active ? 1 : 0.6,
                  cursor: 'pointer',
                  marginBottom: -1.5,
                  borderBottom: active ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'signup' ? 'Créer un compte' : 'Se connecter'}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Email</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={labelStyle}>Mot de passe</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontFamily: 'DM Sans',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '8 caractères minimum' : '••••••••'}
              required
              minLength={mode === 'signup' ? 8 : 6}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label style={labelStyle}>Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
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
              padding: 15,
              borderRadius: 100,
              border: 'none',
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'DM Sans',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
              boxShadow: '0 8px 22px rgba(217,95,59,0.28)',
              transition: 'opacity 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? mode === 'login' ? 'Connexion…' : 'Création…'
              : mode === 'login' ? 'Se connecter →' : 'Rejoindre Kidmapp 🎉'}
          </button>

          {error && (
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--primary)', textAlign: 'center', marginTop: 2 }}>
              {error}
            </div>
          )}
        </form>

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>ou</div>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Apple */}
        <button
          type="button"
          onClick={() => setError('La connexion Apple sera bientôt disponible')}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 100,
            border: 'none',
            background: '#1A1310',
            color: '#fff',
            fontFamily: 'DM Sans',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <AppleIcon /> Continuer avec Apple
        </button>

        {/* Google */}
        <button
          type="button"
          onClick={() => setError('La connexion Google sera bientôt disponible')}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 100,
            border: '1.5px solid var(--border)',
            background: '#fff',
            color: 'var(--text)',
            fontFamily: 'DM Sans',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <GoogleIcon /> Continuer avec Google
        </button>
      </div>

      <ForgotPasswordSheet open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
};

export default AuthModal;
