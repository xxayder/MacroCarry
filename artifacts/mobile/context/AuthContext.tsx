import type { Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

// Dismiss the in-app browser on iOS when the app returns via deep link.
WebBrowser.maybeCompleteAuthSession();

// ─── Environment detection ────────────────────────────────────────────────────
// Constants.expoGoConfig is non-null only when running inside Expo Go.
const IS_EXPO_GO = Constants.expoGoConfig != null;
const RUNTIME =
  Platform.OS === 'web' ? 'web' : IS_EXPO_GO ? 'Expo Go' : 'Development/Production Build';

// ─── Redirect URL ─────────────────────────────────────────────────────────────
// Web:    full-page redirect; detectSessionInUrl:true handles the session.
// Native: makeRedirectUri produces mobile://auth/callback (dev/prod build).
//         Expo Go cannot receive the mobile:// scheme — we block it below.
function buildRedirectUrl(): string {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/callback`;
  }
  // Import makeRedirectUri lazily so web bundles don't trip over it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { makeRedirectUri } = require('expo-auth-session') as typeof import('expo-auth-session');
  return makeRedirectUri({ scheme: 'mobile', path: 'auth/callback' });
}

// Pre-compute once at module load (avoids recomputing on every button tap).
const REDIRECT_URL = Platform.OS === 'web' ? '' : buildRedirectUrl();

console.log('[Auth] Runtime:', RUNTIME);

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isSigningIn: boolean;
  isExpoGo: boolean;
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
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Guards against the deep-link listener and openAuthSessionAsync both
  // processing the same callback URL simultaneously.
  const callbackHandled = useRef(false);

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

  // ─── Session init + auth state subscription ─────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) fetchProfile(s.user.id);
      })
      .catch((e) => {
        console.warn('[Auth] getSession error:', e?.message);
      })
      .finally(() => {
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

  // ─── Native deep-link fallback ───────────────────────────────────────────
  // Fires only when the app is cold-started from the OAuth redirect.
  // openAuthSessionAsync intercepts the URL in the normal flow, so this
  // handler is a safety net. The callbackHandled ref prevents duplicates.
  useEffect(() => {
    if (!isSupabaseConfigured || Platform.OS === 'web' || IS_EXPO_GO) return;

    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (!url.includes('auth/callback')) return;
      if (callbackHandled.current) {
        console.log('[Auth] Callback skipped — duplicate handler');
        return;
      }
      callbackHandled.current = true;
      console.log('[Auth] Deep-link fallback received');

      const fragment = url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const hasAccessToken = !!params.get('access_token');
      const hasRefreshToken = !!params.get('refresh_token');
      console.log('[Auth] has access_token:', hasAccessToken, '| has refresh_token:', hasRefreshToken);

      if (hasAccessToken && hasRefreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: params.get('access_token')!,
          refresh_token: params.get('refresh_token')!,
        });
        console.log('[Auth] setSession called (deep-link):', error ? `error — ${error.message}` : 'ok');
        if (error) console.warn('[Auth] Deep-link setSession error:', error.message);
      }
    });
    return () => sub.remove();
  }, []);

  // ─── signInWithGoogle ────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    // ── Expo Go guard ────────────────────────────────────────────────────
    if (IS_EXPO_GO && Platform.OS !== 'web') {
      throw new Error(
        'Google sign-in requires the MacroCarry development build, not Expo Go. ' +
        'Build and install the dev APK with EAS, then sign in.'
      );
    }

    setIsSigningIn(true);
    callbackHandled.current = false;

    try {
      const redirectTo =
        Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : REDIRECT_URL;

      console.log('[Auth] Runtime:', RUNTIME);
      console.log('[Auth] redirectTo scheme/host/path:', (() => {
        try { const u = new URL(redirectTo); return `${u.protocol}//${u.host}${u.pathname}`; } catch { return redirectTo; }
      })());

      if (Platform.OS === 'web') {
        // ── WEB ──────────────────────────────────────────────────────────
        // Full-page redirect; detectSessionInUrl:true picks up the session
        // automatically when the browser lands on /auth/callback.
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) {
          console.warn('[Auth] signInWithOAuth error:', error.message);
          throw error;
        }
        // Page navigates away — setIsSigningIn stays true intentionally
        // (component will unmount). No finally reset needed for the web path.
        return;
      }

      // ── NATIVE (dev/prod build) ───────────────────────────────────────
      // Implicit flow: tokens arrive in the URL fragment (#access_token=…).
      // skipBrowserRedirect:true returns the OAuth URL so we open it ourselves.
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

      if (result.type !== 'success' || !result.url) {
        // User cancelled or browser was dismissed — clear loading, do nothing.
        return;
      }

      if (callbackHandled.current) {
        console.log('[Auth] Callback skipped — already handled by deep-link listener');
        return;
      }
      callbackHandled.current = true;

      // Log safe URL parts only — never log the full URL or fragments.
      try {
        const cb = new URL(result.url);
        console.log('[Auth] Callback scheme:', cb.protocol, '| host:', cb.hostname, '| path:', cb.pathname);
      } catch {}

      const fragment = result.url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const code = params.get('code') ?? new URLSearchParams(result.url.split('?')[1] ?? '').get('code');

      console.log('[Auth] has access_token:', !!access_token);
      console.log('[Auth] has refresh_token:', !!refresh_token);
      console.log('[Auth] has code param:', !!code);

      if (!access_token || !refresh_token) {
        throw new Error(
          'No tokens in OAuth callback. ' +
          'Ensure mobile://auth/callback is in Supabase Redirect URLs and ' +
          'you are running a development build, not Expo Go.'
        );
      }

      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      console.log('[Auth] setSession called:', sessionError ? `error — ${sessionError.message}` : 'ok');
      if (sessionError) throw sessionError;
      // onAuthStateChange fires automatically with the new session.

    } finally {
      // Always clear signing-in state — covers success, cancel, and all errors.
      setIsSigningIn(false);
    }
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
      isSigningIn, isExpoGo: IS_EXPO_GO,
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
