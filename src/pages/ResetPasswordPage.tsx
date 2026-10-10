import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Page publique cible du lien « mot de passe oublié ».
 * Le lien email passe par /verify côté auth puis redirige ici avec les tokens
 * dans le fragment d'URL ; useAuth les capture et ouvre la session de
 * récupération avant que cette page ne s'affiche. Sans session (lien expiré
 * ou déjà utilisé), on affiche un message d'erreur plutôt que le formulaire.
 */
const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('auth.reset_page_too_short'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.reset_page_mismatch'));
      return;
    }
    setLoading(true);
    try {
      // Session de récupération : ne PAS envoyer current_password ici.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 2500);
    } catch (err: any) {
      setError(err?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: 'var(--bg)',
    borderRadius: 24,
    padding: '32px 28px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
  };
  const input: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1.5px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'DM Sans',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const button: React.CSSProperties = {
    width: '100%',
    padding: 14,
    borderRadius: 100,
    border: 'none',
    background: 'var(--coral, #D95F3B)',
    color: '#fff',
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={card}>
        <div style={{ fontFamily: 'Fraunces', fontSize: 24, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
          {t('auth.reset_page_title')}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : done ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckCircle2 size={20} style={{ color: 'hsl(var(--success))', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
              {t('auth.reset_page_success')}
            </div>
          </div>
        ) : !user ? (
          <>
            <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
              {t('auth.reset_page_invalid')}
            </div>
            <Link to="/" style={{ ...button, textDecoration: 'none' }}>
              {t('auth.reset_page_back_home')}
            </Link>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontFamily: 'DM Sans', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {t('auth.reset_page_desc')}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.reset_page_new_password')}
              autoComplete="new-password"
              required
              style={input}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('auth.reset_page_confirm_password')}
              autoComplete="new-password"
              required
              style={input}
            />
            {error && (
              <div style={{ fontFamily: 'DM Sans', fontSize: 13, color: 'hsl(var(--destructive))' }}>{error}</div>
            )}
            <button type="submit" disabled={loading} style={{ ...button, opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('auth.reset_page_submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
