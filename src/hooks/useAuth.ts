import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

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

const OAUTH_CALLBACK_KEYS = [
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'type',
  'state',
  'provider_token',
  'provider_refresh_token',
];

const getOAuthParamsFromUrl = () => {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashTokenIndex = hash.indexOf('access_token=') >= 0 ? hash.indexOf('access_token=') : hash.indexOf('refresh_token=');
  const hashParams = new URLSearchParams(hashTokenIndex >= 0 ? hash.slice(hashTokenIndex) : hash);
  const searchParams = new URLSearchParams(window.location.search);
  const params = hashParams.has('access_token') || hashParams.has('refresh_token') ? hashParams : searchParams;
  const hasOAuthParams = OAUTH_CALLBACK_KEYS.some((key) => params.has(key));

  if (!hasOAuthParams) return null;

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    fromHash: params === hashParams,
  };
};

const cleanOAuthParamsFromUrl = (fromHash: boolean) => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  OAUTH_CALLBACK_KEYS.forEach((key) => url.searchParams.delete(key));
  if (fromHash) url.hash = '';

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl || '/');
};

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
    let initialSessionHandled = false;
    let isMounted = true;

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
        applySession(session?.user ?? null);
        initialSessionHandled = true;
      }
    );

    const initializeSession = async () => {
      const oauthParams = getOAuthParamsFromUrl();

      if (oauthParams?.refreshToken) {
        try {
          let callbackUser: User | null = null;
          if (oauthParams.accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: oauthParams.accessToken,
              refresh_token: oauthParams.refreshToken,
            });
            if (error) throw error;
            callbackUser = data.session?.user ?? null;
          } else {
            const { data, error } = await supabase.auth.refreshSession({ refresh_token: oauthParams.refreshToken });
            if (error) throw error;
            callbackUser = data.session?.user ?? null;
          }
          cleanOAuthParamsFromUrl(oauthParams.fromHash);
          if (callbackUser) applySession(callbackUser);
        } catch (e) {
          console.error('OAuth callback session setup failed:', e);
          cleanOAuthParamsFromUrl(oauthParams.fromHash);
        }
      }

      // Fallback in case onAuthStateChange doesn't fire
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!initialSessionHandled) {
          applySession(session?.user ?? null);
        }
      }).catch((e) => {
        console.error('Get session failed:', e);
        if (isMounted) setIsLoading(false);
      });
    };

    initializeSession();

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
