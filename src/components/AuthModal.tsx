import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { CATEGORY_ICONS } from '@/assets/icons';

interface AuthModalProps {
  initialMode?: 'login' | 'signup';
  headerMessage?: string;
}


const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const ForgotPasswordSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
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
      setError(err?.message || t('common.error'));
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
            {t('auth.reset_title')}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
            aria-label={t('common.close')}
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
                {t('auth.reset_success_prefix')} <strong>{email}</strong>{t('auth.reset_success_suffix')}
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
              {t('common.close')}
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 0, marginBottom: 18 }}>
              {t('auth.reset_desc')}
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
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
              {loading ? t('auth.sending') : t('auth.send_link')}
            </button>
          </form>
        )}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
};

const AuthModal = ({ initialMode = 'signup', headerMessage }: AuthModalProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const googleLockRef = useRef(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    if (googleLockRef.current) return;
    googleLockRef.current = true;
    setError('');
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError((result.error as Error)?.message || t('auth.error_google_failed'));
        googleLockRef.current = false;
        setGoogleLoading(false);
      }
      // On success/redirect, leave the lock engaged — the browser will navigate away.
    } catch (err: any) {
      setError(err?.message || t('auth.error_google_failed'));
      googleLockRef.current = false;
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    setError('');
  }, [mode]);

  const mapAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) return t('auth.error_invalid_credentials');
    if (lower.includes('user already registered')) return t('auth.error_already_registered');
    if (lower.includes('email not confirmed')) return t('auth.error_email_not_confirmed');
    if (lower.includes('over_email_send_rate_limit') || lower.includes('email rate limit') || lower.includes('for security purposes')) {
      return t('auth.error_rate_limit');
    }
    if (lower.includes('password should be at least')) return t('auth.error_password_length');
    if (lower.includes('unable to validate email')) return t('auth.error_invalid_email');
    return msg || t('common.error');
  };

  const handleResend = async () => {
    if (!signupSuccessEmail || resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupSuccessEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setResendMessage(t('auth.resend_success'));
      setResendCooldown(30);
    } catch (err: any) {
      setResendMessage(mapAuthError(err?.message || ''));
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup') {
      if (password.length < 8) {
        setError(t('auth.error_password_length'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.error_password_mismatch'));
        return;
      }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName);
        setSignupSuccessEmail(email);
        setResendCooldown(30);
      }
    } catch (err: any) {
      setError(mapAuthError(err?.message || ''));
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

        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 48, color: 'var(--primary)', letterSpacing: '-0.04em', fontWeight: 500, position: 'relative', zIndex: 1 }}>
          kidmapp
        </div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: '#C45A38', fontWeight: 500, position: 'relative', zIndex: 1, marginTop: 4 }}>
          {t('auth.tagline')}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, position: 'relative', zIndex: 1 }}>
          {(['restaurant', 'cafe', 'shop', 'public', 'coiffeur'] as const).map((cat) => (
            <div
              key={cat}
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
              <img src={CATEGORY_ICONS[cat]} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
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
        {headerMessage && (
          <div
            style={{
              background: 'var(--accent-light)',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 14,
              fontFamily: 'DM Sans',
              fontSize: 13,
              color: 'var(--text)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {headerMessage}
          </div>
        )}

        {signupSuccessEmail ? (
          <div style={{ padding: '8px 0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'hsl(var(--success) / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={34} style={{ color: 'hsl(var(--success))' }} />
              </div>
            </div>
            <div style={{ fontFamily: 'Fraunces', fontSize: 24, fontWeight: 500, color: 'var(--text)', textAlign: 'center', marginBottom: 10 }}>
              {t('auth.check_email_title')}
            </div>
            <p style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, textAlign: 'center', margin: '0 0 18px' }}>
              {t('auth.check_email_prefix')} <strong style={{ color: 'var(--text)' }}>{signupSuccessEmail}</strong>{t('auth.check_email_suffix')}
              <br />
              <span style={{ fontSize: 13 }}>{t('auth.check_spam')}</span>
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              style={{
                width: '100%',
                padding: 13,
                borderRadius: 100,
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'DM Sans',
                fontSize: 15,
                fontWeight: 600,
                cursor: resendLoading || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                opacity: resendLoading || resendCooldown > 0 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              {resendLoading && <Loader2 size={16} className="animate-spin" />}
              {resendCooldown > 0 ? t('auth.resend_cooldown', { seconds: resendCooldown }) : resendLoading ? t('auth.sending') : t('auth.resend')}
            </button>
            {resendMessage && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
                {resendMessage}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSignupSuccessEmail(null);
                setResendMessage('');
                setPassword('');
                setConfirmPassword('');
                setMode('login');
              }}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 100,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontFamily: 'DM Sans',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              {t('auth.already_confirmed')}
            </button>
          </div>
        ) : (
        <>
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
                {m === 'signup' ? t('auth.tab_signup') : t('auth.tab_login')}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'signup' && (
            <div>
              <label style={labelStyle}>{t('auth.first_name_label')} <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--text-muted)', opacity: 0.7 }}>{t('contribution.optional')}</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('common.example_name')}
                maxLength={60}
                autoComplete="given-name"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>{t('auth.email_label')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>


          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={labelStyle}>{t('auth.password_label')}</label>
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
                  {t('auth.forgot_password')}
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? t('auth.password_placeholder_signup') : '••••••••'}
              required
              minLength={mode === 'signup' ? 8 : 6}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label style={labelStyle}>{t('auth.confirm_password_label')}</label>
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
              padding: 13,
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
              marginTop: 4,
              boxShadow: '0 8px 22px rgba(217,95,59,0.28)',
              transition: 'opacity 0.2s',
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? mode === 'login' ? t('auth.submit_login_loading') : t('auth.submit_signup_loading')
              : mode === 'login' ? t('auth.submit_login') : t('auth.submit_signup')}
          </button>

          {error && (
            <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'var(--primary)', textAlign: 'center', marginTop: 2 }}>
              {error}
            </div>
          )}
        </form>

        {/* Separator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <div style={{ fontFamily: 'DM Sans', fontSize: 12, color: 'var(--text-muted)' }}>{t('auth.or')}</div>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 100,
            border: '1.5px solid var(--border)',
            background: '#fff',
            color: 'var(--text)',
            fontFamily: 'DM Sans',
            fontSize: 14,
            fontWeight: 500,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
          {googleLoading ? t('auth.submit_login_loading') : t('auth.google_continue')}
        </button>
        </>
        )}
      </div>


      <ForgotPasswordSheet open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
};

export default AuthModal;
