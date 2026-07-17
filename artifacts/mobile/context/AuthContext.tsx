import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  return raw;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SignUpResult {
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

  // ─── Session init + auth state subscription ──────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ─── signIn ───────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
    // onAuthStateChange fires automatically and updates user/session/profile.
  };

  // ─── signUp ───────────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    username: string,
  ): Promise<SignUpResult> => {
    const trimmed = username.trim();

    // Client-side username format is validated by the register screen before
    // this is called, but we re-check here as a safety net.
    const usernameError = validateUsername(trimmed);
    if (usernameError) throw new Error(usernameError);

    // Pre-flight: check username availability (case-insensitive).
    // Uses ilike which maps to a case-insensitive LIKE on the profiles table.
    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .maybeSingle();

    if (lookupError && lookupError.code !== 'PGRST116') {
      throw new Error(`Username check failed: ${lookupError.message}`);
    }
    if (existing) throw new Error('Username is already taken. Please choose another.');

    // Create the auth user. Username travels in options.data so the DB trigger
    // (migration 001) can read it from raw_user_meta_data.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: trimmed } },
    });
    if (error) throw new Error(friendlyAuthError(error.message));

    // If a session was returned (email confirmation is disabled), seed a
    // minimal profile row now so:
    //   (a) the username is persisted immediately, and
    //   (b) daily_calorie_goal = 0 causes index.tsx to route to onboarding,
    //       where the user sets their real goals via updateProfile upsert.
    //
    // If no session (email confirmation required), the DB trigger in migration
    // 001 will create the profile row with the username once applied. Until
    // then, profile will be null after the first sign-in, and onboarding will
    // create the profile (username arrives via user.user_metadata.username).
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
      // 23505 = unique_violation — DB trigger already inserted the row; ignore.
      if (profileError && profileError.code !== '23505') {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }
    }

    return { requiresConfirmation: !data.session };
  };

  // ─── signOut ──────────────────────────────────────────────────────────────
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
