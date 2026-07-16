import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

// Required on iOS to dismiss the in-app browser when the app returns via deep link.
WebBrowser.maybeCompleteAuthSession();

/**
 * Build the redirect URL depending on platform.
 *
 * Web:    full-page redirect to /auth/callback on the current origin.
 *         supabase-js (implicit flow) appends #access_token=… to this URL;
 *         detectSessionInUrl:true picks it up automatically on that page.
 *
 * Native: custom scheme deep link so openAuthSessionAsync can intercept it.
 *         Expo Go → exp://<host>/--/auth/callback
 *         Standalone → mobile://auth/callback
 */
function buildRedirectUrl(): string {
  if (Platform.OS === 'web') {
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
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Native-only: fallback deep-link handler (fires if the app cold-starts
  // from the OAuth redirect URL rather than being resumed).
  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web') return;

    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (!url.includes('auth/callback')) return;
      console.log('[Auth] Deep-link fallback received');
      const fragment = url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) console.warn('[Auth] Deep-link setSession error:', error.message);
      }
    });
    return () => sub.remove();
  }, []);

  const signInWithGoogle = async () => {
    const redirectTo = buildRedirectUrl();

    console.log('[Auth] Platform:', Platform.OS);
    console.log('[Auth] redirectTo:', redirectTo);

    if (Platform.OS === 'web') {
      // ── WEB ──────────────────────────────────────────────────────────────
      // No skipBrowserRedirect — Supabase performs a full-page redirect to
      // Google, then back to /auth/callback with tokens in the URL fragment.
      // detectSessionInUrl:true in supabase.ts handles the rest automatically.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) {
        console.warn('[Auth] signInWithOAuth error:', error.message);
        throw error;
      }
      return; // Page navigates away; nothing more to do here.
    }

    // ── NATIVE ────────────────────────────────────────────────────────────
    // skipBrowserRedirect:true → supabase-js returns the OAuth URL instead
    // of opening it, so we hand it to openAuthSessionAsync.
    // Implicit flow → Supabase appends #access_token=…&refresh_token=… to
    // the redirect URL; no PKCE code exchange needed (avoids WebCrypto).
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      console.warn('[Auth] signInWithOAuth error:', error.message);
      throw error;
    }
    if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

    try { console.log('[Auth] OAuth URL hostname:', new URL(data.url).hostname); } catch {}

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });

    console.log('[Auth] WebBrowser result type:', result.type);

    if (result.type === 'success' && result.url) {
      try {
        const cb = new URL(result.url);
        console.log('[Auth] Callback — hostname:', cb.hostname, 'pathname:', cb.pathname);
      } catch {}

      // Implicit flow: tokens are in the URL fragment (#access_token=…)
      const fragment = result.url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          console.warn('[Auth] setSession error:', sessionError.message);
          throw sessionError;
        }
        // onAuthStateChange updates user/session automatically.
      } else {
        console.warn('[Auth] No tokens found in callback URL fragment. URL params:', fragment);
        throw new Error('No tokens in OAuth redirect. Check Supabase redirect URL config.');
      }
    }
    // result.type === 'cancel' → user closed browser, do nothing.
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
    <AuthContext.Provider value={{
      user, session, profile, loading, profileLoading,
      signInWithGoogle, signOut, refreshProfile, updateProfile,
      isConfigured: isSupabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
