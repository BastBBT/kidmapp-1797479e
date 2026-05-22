import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Capté SYNCHRONIQUEMENT à l'import, avant que le detectSessionInUrl async
// de Supabase ne vide le fragment d'URL.
const CAPTURED_OAUTH = (() => {
  if (typeof window === 'undefined') return null;

  const raw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  if (!raw) return null;

  const p = new URLSearchParams(raw);
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  const oauthError = p.get('error_description') || p.get('error');

  if (access_token && refresh_token) return { access_token, refresh_token, oauthError: null as string | null };
  if (oauthError) return { access_token: null, refresh_token: null, oauthError };
  return null;
})();

interface Profile {
  role: 'user' | 'admin';
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile({ role: data.role as 'user' | 'admin' });
      }
    } catch (e) {
      console.error('Profile fetch failed:', e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let authEventHandled = false;
    let isMounted = true;

    if (CAPTURED_OAUTH?.access_token && CAPTURED_OAUTH?.refresh_token) {
      console.log('[oauth] tokens captés depuis le fragment, setSession…');
      supabase.auth.setSession({
        access_token: CAPTURED_OAUTH.access_token,
        refresh_token: CAPTURED_OAUTH.refresh_token,
      }).then(({ data, error }) => {
        if (error) {
          console.error('[oauth] setSession a échoué:', error);
        } else {
          console.log('[oauth] setSession OK, user:', data.session?.user?.email);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      });
    } else if (CAPTURED_OAUTH?.oauthError) {
      console.error('[oauth] erreur dans le fragment:', CAPTURED_OAUTH.oauthError);
    }

    const applySession = (currentUser: User | null) => {
      if (!isMounted) return;
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
      }
      setIsLoading(false);
      if (currentUser) {
        fetchProfile(currentUser.id);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authEventHandled = true;
        applySession(session?.user ?? null);
      }
    );

    // Fallback in case onAuthStateChange doesn't fire.
    // Do not overwrite a session already received from the auth listener.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authEventHandled) {
        applySession(session?.user ?? null);
      }
    }).catch((e) => {
      console.error('Get session failed:', e);
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value: AuthContextValue = {
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
