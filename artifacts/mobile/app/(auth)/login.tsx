import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const { signInWithGoogle, isConfigured } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* Brand */}
      <View style={styles.brand}>
        <View style={[styles.logoBox, { backgroundColor: colors.primarySubtle }]}>
          <Feather name="activity" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>MacroCarry</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Smarter food tracking.{'\n'}Calories that carry forward.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.surface }]}>
              <Feather name={f.icon as any} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + '22', borderColor: colors.destructive + '44' }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: loading ? 0.7 : 1 }]}
          onPress={handleGoogle}
          disabled={loading || !isConfigured}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Feather name="user" size={18} color={colors.text} />
              <Text style={[styles.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.terms, { color: colors.textMuted }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const FEATURES = [
  { icon: 'trending-up', text: 'Track calories, macros, fiber, sugar & sodium' },
  { icon: 'camera', text: 'Scan barcodes with your camera' },
  { icon: 'repeat', text: 'Unused calories carry over to tomorrow' },
  { icon: 'share-2', text: 'Share your food diary with others' },
];

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  brand: { alignItems: 'center', gap: 12 },
  logoBox: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 34, fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  cta: { gap: 14 },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  terms: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16 },
});
