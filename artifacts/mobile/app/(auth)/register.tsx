import { Feather } from '@expo/vector-icons';
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

import { useAuth, validateUsername } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const { signUp, isConfigured } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Resend confirmation state
  const RESEND_COOLDOWN = 60;
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!pendingEmail || resendLoading || resendCooldown > 0) return;
    setResendStatus(null);
    setResendLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
      });
      if (resendError) {
        const msg = resendError.message.toLowerCase();
        if (msg.includes('rate') || msg.includes('too many') || msg.includes('exceeded')) {
          setResendStatus({ ok: false, msg: 'Too many requests. Please wait a few minutes before trying again.' });
        } else if (msg.includes('already confirmed') || msg.includes('already registered')) {
          // Neutral — don't reveal account status
          setResendStatus({ ok: true, msg: 'If the email can be confirmed, a new link has been sent.' });
        } else if (msg.includes('network') || msg.includes('fetch')) {
          setResendStatus({ ok: false, msg: 'Network error. Check your connection and try again.' });
        } else {
          setResendStatus({ ok: true, msg: 'If the email can be confirmed, a new link has been sent.' });
        }
      } else {
        setResendStatus({ ok: true, msg: 'A new confirmation link has been sent.' });
      }
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      setResendStatus({ ok: false, msg: 'An unexpected error occurred. Please try again.' });
    } finally {
      setResendLoading(false);
    }
  };

  const validate = (): string | null => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const usernameErr = validateUsername(trimmedUsername);
    if (usernameErr) return usernameErr;
    if (!trimmedEmail) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    setError(null);

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const { requiresConfirmation } = await signUp(
        email.trim(),
        password,
        username.trim(),
      );
      if (requiresConfirmation) {
        setPendingEmail(email.trim());
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email-confirmation pending screen ────────────────────────────────────
  // Uses NEUTRAL wording: Supabase returns HTTP 200 for both new accounts AND
  // repeated signups with an existing email when confirmation is required, so
  // we cannot confirm whether an account was actually created.
  if (pendingEmail) {
    const canResend = !resendLoading && resendCooldown === 0;
    return (
      <View
        style={[
          styles.confirmWrap,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        <View style={[styles.confirmIcon, { backgroundColor: colors.primarySubtle }]}>
          <Feather name="mail" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.confirmTitle, { color: colors.text }]}>Check your email</Text>
        <Text style={[styles.confirmBody, { color: colors.textSecondary }]}>
          If{' '}
          <Text style={[styles.confirmEmail, { color: colors.text }]}>{pendingEmail}</Text>
          {' '}can be registered, a confirmation link has been sent.
          {'\n\n'}
          If you already have an account, sign in instead or reset your password.
        </Text>

        {/* Resend status */}
        {resendStatus && (
          <View
            style={[
              styles.resendStatus,
              {
                backgroundColor: resendStatus.ok ? colors.primarySubtle : colors.destructive + '18',
                borderColor: resendStatus.ok ? colors.primary + '40' : colors.destructive + '40',
              },
            ]}
          >
            <Feather
              name={resendStatus.ok ? 'check-circle' : 'alert-circle'}
              size={14}
              color={resendStatus.ok ? colors.primary : colors.destructive}
            />
            <Text
              style={[
                styles.resendStatusText,
                { color: resendStatus.ok ? colors.primary : colors.destructive },
              ]}
            >
              {resendStatus.msg}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Go to Sign In</Text>
        </TouchableOpacity>

        {/* Resend confirmation */}
        <TouchableOpacity
          style={[
            styles.resendBtn,
            {
              borderColor: colors.border,
              opacity: canResend ? 1 : 0.5,
            },
          ]}
          onPress={handleResend}
          disabled={!canResend}
          activeOpacity={0.7}
        >
          {resendLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.resendBtnText, { color: colors.primary }]}>
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend confirmation email'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

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
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoBox, { backgroundColor: colors.primarySubtle }]}>
            <Feather name="activity" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>MacroCarry</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Create your account
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + '18',
                  borderColor: colors.destructive + '40',
                },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} style={{ marginTop: 1 }} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <View
              style={[
                styles.inputRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Feather name="at-sign" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={username}
                onChangeText={setUsername}
                placeholder="your_username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              3–24 characters · letters, numbers, and underscores only
            </Text>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <View
              style={[
                styles.inputRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Feather name="mail" size={16} color={colors.textMuted} />
              <TextInput
                ref={emailRef}
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View
              style={[
                styles.inputRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Feather name="lock" size={16} color={colors.textMuted} />
              <TextInput
                ref={passwordRef}
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
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View
              style={[
                styles.inputRow,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Feather name="lock" size={16} color={colors.textMuted} />
              <TextInput
                ref={confirmRef}
                style={[styles.input, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                <Feather
                  name={showConfirm ? 'eye-off' : 'eye'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.btn,
              {
                backgroundColor: colors.primary,
                opacity: loading || !isConfigured ? 0.7 : 1,
              },
            ]}
            onPress={handleRegister}
            disabled={loading || !isConfigured}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, gap: 28 },
  brand: { alignItems: 'center', gap: 10 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: 30, fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  form: { gap: 14 },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  fieldGroup: { gap: 5 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  footerLink: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  // Confirmation screen
  confirmWrap: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  confirmBody: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmEmail: { fontFamily: 'Inter_600SemiBold' },
  resendStatus: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  resendStatusText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  resendBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
