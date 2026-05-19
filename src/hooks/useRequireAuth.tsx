import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'signup';

interface RequireAuthContextValue {
  requireAuth: (action: () => void, opts?: { message?: string; mode?: AuthMode }) => void;
  openAuth: (mode?: AuthMode, message?: string) => void;
}

const RequireAuthContext = createContext<RequireAuthContextValue | null>(null);

export const RequireAuthProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [message, setMessage] = useState<string | undefined>();
  const pendingAction = useRef<(() => void) | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    pendingAction.current = null;
    setMessage(undefined);
  }, []);

  const requireAuth = useCallback<RequireAuthContextValue['requireAuth']>(
    (action, opts) => {
      if (user) {
        action();
        return;
      }
      pendingAction.current = action;
      setMode(opts?.mode ?? 'signup');
      setMessage(opts?.message);
      setOpen(true);
    },
    [user]
  );

  const openAuth = useCallback<RequireAuthContextValue['openAuth']>((m = 'signup', msg) => {
    pendingAction.current = null;
    setMode(m);
    setMessage(msg);
    setOpen(true);
  }, []);

  // Replay pending action after successful sign-in
  useEffect(() => {
    if (!user) return;

    setOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    setMessage(undefined);
    if (action) {
      // Defer to next tick so React-Query / auth context can refresh
      setTimeout(() => action(), 50);
    }
  }, [user]);

  return (
    <RequireAuthContext.Provider value={{ requireAuth, openAuth }}>
      {children}
      {open && !user && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1500,
            background: 'var(--bg)',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            onClick={close}
            aria-label="Fermer"
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
              right: 12,
              zIndex: 1600,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
          <AuthModal initialMode={mode} headerMessage={message} />
        </div>
      )}
    </RequireAuthContext.Provider>
  );
};

export const useRequireAuth = (): RequireAuthContextValue => {
  const ctx = useContext(RequireAuthContext);
  if (!ctx) throw new Error('useRequireAuth must be used within RequireAuthProvider');
  return ctx;
};
