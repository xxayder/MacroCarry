/**
 * Low-level biometric utilities.
 *
 * Stores ONLY:
 *   macrocarry_biometric_enabled  — 'true' | 'false'
 *   macrocarry_biometric_user_id  — the Supabase user UUID
 *
 * Never stores passwords, tokens, session objects, or biometric data.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const BIOMETRIC_ENABLED_KEY = 'macrocarry_biometric_enabled';
export const BIOMETRIC_USER_ID_KEY = 'macrocarry_biometric_user_id';

// ─── SecureStore helpers ─────────────────────────────────────────────────────

export interface BiometricPreference {
  enabled: boolean;
  userId: string | null;
}

export async function readBiometricPreference(): Promise<BiometricPreference> {
  if (Platform.OS === 'web') return { enabled: false, userId: null };
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    const userId = await SecureStore.getItemAsync(BIOMETRIC_USER_ID_KEY);
    return { enabled: enabled === 'true', userId: userId ?? null };
  } catch {
    return { enabled: false, userId: null };
  }
}

export async function writeBiometricPreference(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  await SecureStore.setItemAsync(BIOMETRIC_USER_ID_KEY, userId);
}

export async function clearBiometricPreference(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_ID_KEY);
  } catch {
    // Keys may not exist — not an error.
  }
}

// ─── Hardware checks ─────────────────────────────────────────────────────────

export interface HardwareStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
}

export async function checkBiometricHardware(): Promise<HardwareStatus> {
  if (Platform.OS === 'web') {
    console.log('[Biometric] platform: web — hardware check skipped');
    return { hasHardware: false, isEnrolled: false };
  }
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
  console.log('[Biometric] platform:', Platform.OS);
  console.log('[Biometric] has hardware:', hasHardware);
  console.log('[Biometric] is enrolled:', isEnrolled);
  return { hasHardware, isEnrolled };
}

// ─── Authentication ───────────────────────────────────────────────────────────

export type BiometricAuthResult =
  | { success: true }
  | { success: false; reason: 'cancelled' | 'failed' | 'error'; message?: string };

export async function performBiometricAuth(prompt: string): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    if (result.success) {
      console.log('[Biometric] result: success');
      return { success: true };
    }

    const isCancelled =
      result.error === 'user_cancel' ||
      result.error === 'system_cancel' ||
      result.error === 'app_cancel';

    console.log('[Biometric] result:', isCancelled ? 'cancelled' : 'failed', result.error ?? '');
    return { success: false, reason: isCancelled ? 'cancelled' : 'failed' };
  } catch (e: any) {
    console.log('[Biometric] result: error —', e?.message);
    return { success: false, reason: 'error', message: e?.message };
  }
}
