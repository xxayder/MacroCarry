/**
 * BiometricLockScreen
 *
 * Shown by BiometricGate (in _layout.tsx) when the app is locked on cold start.
 * This is a component, NOT a route — it renders in place of the entire navigator,
 * so authenticated content is never visible behind it.
 *
 * Loading states are independent of AuthContext, login, signup, and sign-out.
 */
import { Feather } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBiometric } from '@/context/BiometricContext';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { performBiometricAuth } from '@/lib/biometrics';

export function BiometricLockScreen() {
  const { unlock } = useBiometric();
  const { signOut } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // These loading states are isolated — they must not affect auth/signup/sign-out loading.
  const [unlocking, setUnlocking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ─── Biometric unlock attempt ─────────────────────────────────────────────
  const handleUnlock = async () => {
    if (unlocking || signingOut) return;
    setMessage(null);
    setUnlocking(true);
    try {
      const result = await performBiometricAuth('Unlock MacroCarry');
      if (result.success) {
        unlock(); // Clears isLocked — BiometricGate shows normal app immediately
      } else if (result.reason === 'cancelled') {
        setMessage('Authentication was cancelled. Tap below to try again.');
      } else {
        setMessage('Authentication failed. Please try again.');
      }
    } finally {
      setUnlocking(false);
    }
  };

  // ─── Fallback: sign out and go to login ───────────────────────────────────
  // Calls the same verified signOut path as Settings, which:
  //   - clears Supabase local session
  //   - clears React Query cache
  //   - calls clearBiometricPreference() (removes SecureStore values)
  // BiometricContext sign-out cleanup then clears in-memory state.
  const handleFallback = async () => {
    if (signingOut || unlocking) return;
    setMessage(null);
    setSigningOut(true);
    try {
      await signOut();
      // Route guard (index.tsx) redirects to /(auth)/login once user is null.
    } catch (err: any) {
      setMessage(err.message ?? 'Sign-out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
        },
      ]}
    >
      {/* Icon + title */}
      <View style={styles.hero}>
        <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
          <MaterialIcons name="fingerprint" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Unlock MacroCarry</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Confirm your identity to continue
        </Text>
      </View>

      {/* Status message after cancellation or failure */}
      {message != null && (
        <View
          style={[
            styles.messageBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather name="info" size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
          <Text style={[styles.messageText, { color: colors.textSecondary }]}>{message}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {/* Primary: biometric unlock */}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              opacity: unlocking || signingOut ? 0.7 : 1,
            },
          ]}
          onPress={handleUnlock}
          disabled={unlocking || signingOut}
          activeOpacity={0.85}
        >
          {unlocking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="fingerprint" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Unlock with Biometrics</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secondary: fall back to email/password */}
        <TouchableOpacity
          style={[styles.fallbackBtn, { opacity: signingOut || unlocking ? 0.5 : 1 }]}
          onPress={handleFallback}
          disabled={signingOut || unlocking}
          activeOpacity={0.7}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
              Use email and password instead
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  actions: {
    gap: 14,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  fallbackBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
