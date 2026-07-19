import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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

const NATIVE_REDIRECT = 'mobile://auth/reset-password';

function webRedirect(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/reset-password`;
  }
  return NATIVE_REDIRECT;
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web' ? webRedirect() : NATIVE_REDIRECT;
      const { error: apiError } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (apiError && __DEV__) {
        console.warn('[ForgotPassword]', apiError.message);
      }
      // Always show neutral success — never reveal whether an account exists.
      setSubmitted(true);
    } catch (err) {
      if (__DEV__) console.warn('[ForgotPassword] unexpected error:', err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View
        style={[
          styles.successWrap,
          { backgroundColor: colors.background, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
          <Feather name="mail" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If an account is associated with{' '}
          <Text style={[styles.bold, { color: colors.text }]}>{email.trim()}</Text>
          , a password reset link has been sent.{'\n\n'}
          The link expires in 1 hour. Check your spam folder if you don't see it.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>Back to Sign In</Text>
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
        {/* Back */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Sign In</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
            <Feather name="unlock" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we'll send a link if an account exists.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '40' },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} style={{ marginTop: 1 }} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Feather name="mail" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, gap: 32 },
  successWrap: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  header: { alignItems: 'center', gap: 10 },
  iconBox: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
  bold: { fontFamily: 'Inter_600SemiBold' },
  form: { gap: 16 },
  errorBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'flex-start' },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
