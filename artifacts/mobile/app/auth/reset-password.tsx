import { Feather } from '@expo/vector-icons';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';

type Phase = 'loading' | 'ready' | 'submitting' | 'success' | 'error';

function parseFragment(url: string): Record<string, string> {
  const idx = url.indexOf('#');
  if (idx === -1) return {};
  const out: Record<string, string> = {};
  for (const part of url.slice(idx + 1).split('&')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      try {
        out[decodeURIComponent(part.slice(0, eq))] = decodeURIComponent(part.slice(eq + 1));
      } catch {
        // skip malformed param
      }
    }
  }
  return out;
}

async function establishRecoverySession(url: string): Promise<string | null> {
  const params = parseFragment(url);
  const { access_token, refresh_token, type } = params;

  if (type !== 'recovery') return 'This link is invalid or has already been used.';
  if (!access_token || !refresh_token) return 'Recovery tokens are missing. Please request a new link.';

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('expired') || msg.includes('invalid')) {
      return 'This link has expired. Please request a new one.';
    }
    return 'The recovery link is no longer valid. Please request a new one.';
  }
  return null; // success
}

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const confirmRef = useRef<TextInput>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const process = async (url: string | null) => {
      if (cancelled) return;

      if (!url) {
        setLinkError('No recovery link found. Please request a new one.');
        setPhase('error');
        return;
      }

      // On web, detectSessionInUrl:true means supabase-js already handled the
      // token. Wait for the onAuthStateChange PASSWORD_RECOVERY event instead.
      if (Platform.OS === 'web') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          if (session) {
            setPhase('ready');
          } else {
            setLinkError('This link is invalid or has already been used.');
            setPhase('error');
          }
        }
        return;
      }

      // Native: parse the hash fragment and inject the recovery session manually.
      const err = await establishRecoverySession(url);
      if (!cancelled) {
        if (err) {
          setLinkError(err);
          setPhase('error');
        } else {
          setPhase('ready');
        }
      }
    };

    // Case 1: app was launched from a cold start via the deep link.
    ExpoLinking.getInitialURL().then((url) => {
      if (!cancelled && url) {
        process(url);
      }
    });

    // Case 2: app was already in the foreground/background when the link arrived.
    const subscription = ExpoLinking.addEventListener('url', ({ url }) => {
      process(url);
    });

    // Safety timeout — if neither fires in 4 s we have no recovery link.
    const timeout = setTimeout(() => {
      if (!cancelled && phase === 'loading') {
        setLinkError('No recovery link found. Please request a new one.');
        setPhase('error');
      }
    }, 4000);

    return () => {
      cancelled = true;
      subscription.remove();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async () => {
    setFieldError(null);
    if (!password) { setFieldError('New password is required.'); return; }
    if (password.length < 6) { setFieldError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setFieldError('Passwords do not match.'); return; }

    setPhase('submitting');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const msg = error.message.toLowerCase();
        let friendly = 'Password update failed. Please request a new link.';
        if (msg.includes('same password') || msg.includes('different from')) {
          friendly = 'Choose a password you haven\'t used before.';
        } else if (msg.includes('weak') || msg.includes('at least')) {
          friendly = 'Password must be at least 6 characters.';
        }
        setFieldError(friendly);
        setPhase('ready');
        return;
      }
      // Clear the recovery session so the user must sign in with the new password.
      await supabase.auth.signOut({ scope: 'local' });
      setPhase('success');
    } catch (err) {
      if (__DEV__) console.error('[ResetPassword] updateUser error:', err);
      setFieldError('An unexpected error occurred. Please try again.');
      setPhase('ready');
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Verifying link…</Text>
      </View>
    );
  }

  // ── Link invalid / expired ───────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.destructive + '18' }]}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Link unavailable</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{linkError}</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(auth)/forgot-password')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Request New Link</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.textLink}>
          <Text style={[styles.textLinkText, { color: colors.primary }]}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (phase === 'success') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
          <Feather name="check-circle" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Password updated</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your password has been changed. Sign in with your new password.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form (ready | submitting) ─────────────────────────────────────────────
  const isSubmitting = phase === 'submitting';
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
            <Feather name="lock" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>New password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose a strong password of at least 6 characters.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {fieldError && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '40' },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} style={{ marginTop: 1 }} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{fieldError}</Text>
            </View>
          )}

          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>New Password</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Feather name="lock" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                editable={!isSubmitting}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Feather name="lock" size={16} color={colors.textMuted} />
              <TextInput
                ref={confirmRef}
                style={[styles.input, { color: colors.text }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleReset}
                editable={!isSubmitting}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                <Feather name={showConfirm ? 'eye-off' : 'eye'} size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleReset}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  container: { paddingHorizontal: 28, gap: 32 },
  header: { alignItems: 'center', gap: 10 },
  iconBox: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  form: { gap: 16 },
  errorBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  textLink: { marginTop: 4 },
  textLinkText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
