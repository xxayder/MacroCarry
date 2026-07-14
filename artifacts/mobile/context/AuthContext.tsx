import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

// Required on iOS to dismiss the in-app browser when returning via deep link.
WebBrowser.maybeCompleteAuthSession();

/**
 * Build the redirect URL depending on platform:
 *  - web:    full-page redirect to /auth/callback on the current origin
 *  - native: custom scheme deep link (mobile://auth/callback in standalone,
 *            exp://…/--/auth/callback in Expo Go)
 */
function buildRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // window is always available on web; never called on native.
    return `${window.location.origin}/auth/callback`;
  }
  return Linking.createURL('auth/callback');
}

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
        console.warn('[Auth] Profile fetch error:', error.message);
        setProfile(null);
      } else {
        setProfile(data as Profile ?? null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Restore session on mount and subscribe to auth state changes.
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

  // Native-only: handle deep-link fallback for PKCE code exchange.
  // Fires when the app is cold-started from the OAuth redirect URL.
  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') return;

    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth/callback')) {
        console.log('[Auth] Deep-link callback received, exchanging code…');
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) console.warn('[Auth] Deep-link exchange error:', error.message);
      }
    });
    return () => sub.remove();
  }, []);

  const signInWithGoogle = async () => {
    const redirectTo = buildRedirectUrl();

    // ── Diagnostic logging (safe — no tokens or secrets) ──────────────────
    console.log('[Auth] Platform:', Platform.OS);
    console.log('[Auth] redirectTo:', redirectTo);
    // ──────────────────────────────────────────────────────────────────────

    if (Platform.OS === 'web') {
      // ── WEB FLOW ─────────────────────────────────────────────────────────
      // skipBrowserRedirect must be false (default) on web so Supabase
      // performs a full-page redirect to Google rather than returning a URL
      // for us to open manually.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) {
        console.warn('[Auth] signInWithOAuth error:', error.message);
        throw error;
      }
      // Supabase redirects the entire page to Google — no further code runs here.
      return;
    }

    // ── NATIVE FLOW ───────────────────────────────────────────────────────
    // skipBrowserRedirect: true tells supabase-js to return the OAuth URL
    // instead of opening it itself, so we can hand it to openAuthSessionAsync.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      console.warn('[Auth] signInWithOAuth error:', error.message);
      throw error;
    }
    if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

    try {
      console.log('[Auth] OAuth URL hostname:', new URL(data.url).hostname);
    } catch {}

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });

    console.log('[Auth] WebBrowser result type:', result.type);

    if (result.type === 'success' && result.url) {
      try {
        const cb = new URL(result.url);
        console.log('[Auth] Callback hostname:', cb.hostname, 'pathname:', cb.pathname);
      } catch {}

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) {
        console.warn('[Auth] exchangeCodeForSession error:', exchangeError.message);
        throw exchangeError;
      }
      // onAuthStateChange updates user/session state automatically.
    }
    // result.type === 'cancel' — user closed the browser, nothing to do.
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
