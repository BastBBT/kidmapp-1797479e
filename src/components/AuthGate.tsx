import { ReactNode, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from './AuthModal';
import Onboarding from './Onboarding';

const ONBOARDING_KEY = 'kidmapp_hasSeenOnboarding';

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  useEffect(() => {
    if (isLoading) return;
    if (user) return;
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (!seen) setShowOnboarding(true);
    } catch {
      // ignore
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (showOnboarding) {
      return (
        <Onboarding
          onFinish={(mode) => {
            setAuthMode(mode);
            setShowOnboarding(false);
          }}
        />
      );
    }
    return <AuthModal initialMode={authMode} />;
  }

  return <>{children}</>;
};

export default AuthGate;
