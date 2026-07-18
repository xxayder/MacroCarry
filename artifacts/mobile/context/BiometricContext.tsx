/**
 * BiometricContext — manages biometric lock state for the app.
 *
 * Architecture:
 *   - Sits inside AuthProvider so it can read the current user.
 *   - Controls BiometricGate in _layout.tsx, which prevents RootLayoutNav
 *     from rendering until the lock decision is made.
 *   - Lock is applied ONLY on cold start with an existing session.
 *     Explicit sign-in with email/password never triggers a lock.
 *
 * What is stored (via lib/biometrics.ts):
 *   macrocarry_biometric_enabled  — 'true' | 'false'
 *   macrocarry_biometric_user_id  — Supabase user UUID
 *
 * What is NEVER stored: passwords, tokens, sessions, biometric data.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import {
  checkBiometricHardware,
  clearBiometricPreference,
  performBiometricAuth,
  readBiometricPreference,
  writeBiometricPreference,
} from '@/lib/biometrics';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BiometricContextValue {
  /** True while SecureStore or auth state is still loading. BiometricGate shows
   *  a blank screen during this window to prevent content flash. */
  initializing: boolean;
  /** True when the app is locked and the lock screen must be shown. */
  isLocked: boolean;
  /** Whether biometric unlock is currently enabled for the signed-in user. */
  isBiometricEnabled: boolean;
  /** Mark the session as unlocked after a successful biometric auth. */
  unlock: () => void;
  /** Check hardware → prompt auth → persist preference. Throws on failure. */
  enableBiometrics: () => Promise<void>;
  /** Prompt auth → remove preference. Throws on failure. */
  disableBiometrics: () => Promise<void>;
}

const BiometricContext = createContext<BiometricContextValue>({} as BiometricContextValue);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioUserId, setBioUserId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [secureStoreLoading, setSecureStoreLoading] = useState(true);

  // True until BOTH SecureStore and auth have resolved their initial state.
  const initializing = secureStoreLoading || authLoading;

  // Guard to ensure the cold-start lock decision fires exactly once.
  const initializedRef = useRef(false);

  // ─── 1. Read SecureStore on mount ─────────────────────────────────────────
  useEffect(() => {
    readBiometricPreference()
      .then(({ enabled, userId }) => {
        setBioEnabled(enabled);
        setBioUserId(userId);
        console.log('[Biometric] biometric unlock enabled:', enabled);
        if (userId) {
          // Only log that a stored ID exists, not the ID itself
          console.log('[Biometric] stored user ID present:', true);
        }
      })
      .finally(() => setSecureStoreLoading(false));
  }, []);

  // ─── 2. Cold-start lock decision (fires once, after both loading flags clear) ──
  useEffect(() => {
    if (initializedRef.current) return; // Already decided
    if (secureStoreLoading || authLoading) return; // Still loading

    initializedRef.current = true;

    const userId = user?.id ?? null;
    const userMatch = userId !== null && bioUserId === userId;
    const shouldLock = userId !== null && bioEnabled && userMatch;

    console.log('[Biometric] platform:', Platform.OS);
    console.log('[Biometric] biometric unlock enabled:', bioEnabled);
    console.log('[Biometric] stored user matches current user:', userMatch);
    console.log('[Biometric] app:', shouldLock ? 'locked' : 'unlocked');

    if (shouldLock) setIsLocked(true);
    // If shouldLock is false, isLocked stays false — no action needed.
  }, [secureStoreLoading, authLoading, user?.id, bioEnabled, bioUserId]);

  // ─── 3. Sign-out cleanup ──────────────────────────────────────────────────
  // When user becomes null (sign-out), clear all in-memory biometric state.
  // SecureStore was already cleared by AuthContext.signOut() calling
  // clearBiometricPreference() — we only reset local state here.
  useEffect(() => {
    if (user === null && initializedRef.current) {
      setBioEnabled(false);
      setBioUserId(null);
      setIsLocked(false);
      console.log('[Biometric] app: unlocked (signed out)');
    }
  }, [user]);

  // ─── unlock ───────────────────────────────────────────────────────────────
  const unlock = useCallback(() => {
    setIsLocked(false);
    console.log('[Biometric] app: unlocked (successful auth)');
  }, []);

  // ─── enableBiometrics ─────────────────────────────────────────────────────
  const enableBiometrics = useCallback(async () => {
    if (Platform.OS === 'web') {
      throw new Error('Biometric unlock is not available on web.');
    }
    if (!user) throw new Error('You must be signed in to enable biometric unlock.');

    // 1. Verify hardware
    const { hasHardware, isEnrolled } = await checkBiometricHardware();
    if (!hasHardware) {
      throw new Error('This device does not have compatible biometric hardware.');
    }
    if (!isEnrolled) {
      throw new Error(
        'No biometric data is enrolled. Open your phone settings to set up Face ID or fingerprint first.',
      );
    }

    // 2. Require one successful auth confirmation before enabling
    const result = await performBiometricAuth('Confirm your identity to enable biometric unlock');
    if (!result.success) {
      if (result.reason === 'cancelled') throw new Error('Cancelled.');
      throw new Error('Biometric confirmation failed. Please try again.');
    }

    // 3. Persist preference (user ID only — no tokens or credentials)
    await writeBiometricPreference(user.id);
    setBioEnabled(true);
    setBioUserId(user.id);
    console.log('[Biometric] biometric unlock enabled: true');
  }, [user]);

  // ─── disableBiometrics ────────────────────────────────────────────────────
  const disableBiometrics = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!user) return;

    // Require biometric confirmation before disabling (when hardware is available)
    const { hasHardware, isEnrolled } = await checkBiometricHardware();
    if (hasHardware && isEnrolled) {
      const result = await performBiometricAuth('Confirm your identity to disable biometric unlock');
      if (!result.success) {
        if (result.reason === 'cancelled') throw new Error('Cancelled.');
        throw new Error('Biometric confirmation failed. Please try again.');
      }
    }

    await clearBiometricPreference();
    setBioEnabled(false);
    setBioUserId(null);
    console.log('[Biometric] biometric unlock enabled: false');
  }, [user]);

  return (
    <BiometricContext.Provider
      value={{
        initializing,
        isLocked,
        isBiometricEnabled: bioEnabled,
        unlock,
        enableBiometrics,
        disableBiometrics,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometric() {
  return useContext(BiometricContext);
}
