import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

// Required on iOS to dismiss the auth browser when the app is brought back to
// the foreground via a deep link.
WebBrowser.maybeCompleteAuthSession();

// The redirect URL sent to Supabase during OAuth.
// Linking.createURL('auth/callback') produces:
//   - Standalone build: mobile://auth/callback
//   - Expo Go (dev):    exp://<host>/--/auth/callback
// Both must be added to Supabase → Authentication → URL Configuration → Redirect URLs.
const REDIRECT_URL = Linking.createURL('auth/callback');

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch error:', error.message);
        setProfile(null);
      } else {
        setProfile(data as Profile ?? null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Restore session on mount and listen for auth state changes.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Handle deep-link fallback for PKCE code exchange.
  // This fires when the app is cold-started from the OAuth redirect (rare on Android,
  // but ensures correctness when openAuthSessionAsync doesn't capture the URL directly).
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth/callback')) {
        await supabase.auth.exchangeCodeForSession(url);
      }
    });
    return () => sub.remove();
  }, []);

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

    // Open the Google sign-in page in an in-app browser.
    // When Google redirects back to REDIRECT_URL, the browser is closed and
    // result.url contains the full redirect URL with the PKCE `code` param.
    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL, {
      showInRecents: true,
    });

    if (result.type === 'success' && result.url) {
      // Exchange the PKCE authorization code for a Supabase session.
      // supabase-js parses the `code` query param from the URL internally.
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) throw exchangeError;
      // onAuthStateChange above will update user/session state automatically.
    }
    // result.type === 'cancel' means the user closed the browser — do nothing.
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, ...updates }, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading, profileLoading,
        signInWithGoogle, signOut, refreshProfile, updateProfile,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
