import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { queryClient } from '@/lib/queryClient';
import { clearBiometricPreference } from '@/lib/biometrics';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

// ─── Username validation ──────────────────────────────────────────────────────
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function validateUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return 'Username must be at least 3 characters.';
  if (trimmed.length > 24) return 'Username must be 24 characters or fewer.';
  if (!USERNAME_REGEX.test(trimmed)) return 'Username may only contain letters, numbers, and underscores.';
  return null;
}

// ─── Friendly auth error messages ────────────────────────────────────────────
function friendlyAuthError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Check your email to confirm your account, then return and sign in.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  // Do not surface "user already registered" — it reveals whether an email exists.
  // Caller must handle the no-session case with neutral wording.
  return raw;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SignUpResult {
  requiresConfirmation: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
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
  // loading = true until INITIAL_SESSION fires
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
        setProfile((data as Profile) ?? null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ─── Auth state listener ─────────────────────────────────────────────────
  // Use onAuthStateChange exclusively — it fires with INITIAL_SESSION on
  // subscription, making a separate getSession() call unnecessary and avoiding
  // the double-fetchProfile race that occurred when both ran concurrently.
  //
  // IMPORTANT: the callback MUST be synchronous. Do not await inside it or
  // call Supabase APIs from within it — doing so can deadlock the auth state
  // machine in supabase-js v2.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Immediately clear profile when signed out so the route guard acts fast.
      if (!s?.user) setProfile(null);
      // Release the initial loading gate as soon as the first event arrives.
      if (event === 'INITIAL_SESSION') setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Profile fetch — driven by user id changes ───────────────────────────
  // Separate from the auth listener so the callback stays synchronous.
  useEffect(() => {
    if (user?.id) {
      fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  // ─── signIn ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
    // onAuthStateChange fires SIGNED_IN and updates user/session/profile.
  };

  // ─── signUp ───────────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    username: string,
  ): Promise<SignUpResult> => {
    const trimmed = username.trim();

    // 1. Local format validation (redundant with register screen but a safety net)
    const usernameError = validateUsername(trimmed);
    if (usernameError) throw new Error(usernameError);

    // 2. Server-side availability check via SECURITY DEFINER RPC.
    //    This bypasses RLS, returns only a boolean, and exposes no profile data.
    //    Migration 002 must be applied before this works. If the function doesn't
    //    exist yet, the RPC call returns an error and we fall back to a warning —
    //    the unique DB index (migration 001) remains the final authoritative guard.
    const { data: isAvailable, error: availError } = await supabase.rpc(
      'is_username_available',
      { candidate: trimmed },
    );

    if (availError) {
      if (__DEV__) console.warn('[Auth] is_username_available RPC failed:', availError.message);
      // Fall through — the DB trigger + unique index will catch duplicates.
    } else if (isAvailable === false) {
      throw new Error('Username is already taken. Please choose another.');
    }

    // 3. Create the auth user. Username is in options.data so the DB trigger
    //    (migration 001) can read it from raw_user_meta_data.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: trimmed } },
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();

      // If the trigger rejected the INSERT due to the unique username index,
      // Supabase surfaces this as "Database error saving new user".
      // Re-check availability to give the user the right message.
      if (msg.includes('database error')) {
        const { data: recheckAvail } = await supabase.rpc('is_username_available', {
          candidate: trimmed,
        });
        if (recheckAvail === false) {
          throw new Error('Username is already taken. Please choose another.');
        }
      }

      if (__DEV__) console.error('[Auth] signUp error:', signUpError.message);
      throw new Error('Account creation failed. Please try again.');
    }

    // 4. Seed a minimal profile row if Supabase returned an active session
    //    (email confirmation is disabled). Goals are set to 0 so index.tsx
    //    routes the user to onboarding, which fills in the real values.
    //
    //    When the DB trigger (migration 001) is active it runs first;
    //    the insert here then hits a 23505 duplicate-key error which we ignore.
    if (data.session && data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email!,
        username: trimmed,
        daily_calorie_goal: 0,
        protein_goal_g: 0,
        carbs_goal_g: 0,
        fat_goal_g: 0,
        fiber_goal_g: 0,
        sugar_goal_g: 0,
        sodium_goal_mg: 0,
        carryover_enabled: true,
      });
      // 23505 = unique_violation — trigger already created the row, ignore.
      if (profileError && profileError.code !== '23505') {
        if (__DEV__) console.warn('[Auth] Profile seed error:', profileError.message);
      }
    }

    // 5. No active session: email confirmation is required.
    //    Show NEUTRAL wording — never state definitively that a new account was
    //    created (Supabase returns HTTP 200 for repeated email signups too).
    return { requiresConfirmation: !data.session };
  };

  // ─── signOut ──────────────────────────────────────────────────────────────
  // Uses scope:'local' — removes the local session token immediately.
  // supabase-js clears AsyncStorage even when the server revocation fails, so
  // the user is effectively signed out on this device regardless of the error.
  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    // Clear local state before throwing, so a failed server call still signs
    // the user out on this device (the local token is already gone).
    setUser(null);
    setSession(null);
    setProfile(null);
    queryClient.clear();
    // Remove biometric preference from SecureStore so the next cold start
    // (for this or any other user) does not show the lock screen.
    // BiometricContext's sign-out effect clears in-memory state separately.
    await clearBiometricPreference();

    if (error) throw new Error(error.message);
    // onAuthStateChange fires SIGNED_OUT and clears state too (redundant but fine).
  };

  // ─── helpers ──────────────────────────────────────────────────────────────
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
        user,
        session,
        profile,
        loading,
        profileLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
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
