import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { supabaseUrlRaw } from '@/lib/supabase';

export function SetupRequired() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Diagnose what's wrong
  const urlSet = !!supabaseUrlRaw;
  const urlValid = supabaseUrlRaw?.startsWith('https://') || supabaseUrlRaw?.startsWith('http://');

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
        <Feather name="alert-circle" size={40} color={colors.warning} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Supabase Setup Required</Text>

      {/* Show what's wrong specifically */}
      {urlSet && !urlValid ? (
        <View style={[styles.errorBox, { backgroundColor: '#3D1F1F', borderColor: colors.destructive + '55' }]}>
          <Feather name="x-circle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            Your Supabase URL is set but doesn't start with{' '}
            <Text style={styles.code}>https://</Text>
          </Text>
        </View>
      ) : null}

      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Add these two secrets in{' '}
        <Text style={[styles.bold, { color: colors.text }]}>Replit → Tools → Secrets</Text>:
      </Text>

      <View style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row
          name="EXPO_PUBLIC_SUPABASE_URL"
          example="https://abcxyz.supabase.co"
          colors={colors}
          set={urlSet}
          valid={!!urlValid}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Row
          name="EXPO_PUBLIC_SUPABASE_ANON_KEY"
          example="eyJhbGci..."
          colors={colors}
          set={!!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}
          valid={!!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}
        />
      </View>

      <View style={[styles.steps, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.stepsTitle, { color: colors.textSecondary }]}>WHERE TO FIND THESE</Text>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.stepNum, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.stepNumText, { color: colors.primary }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.text }]}>{s}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.hint, { color: colors.textMuted }]}>
        After saving the secrets, the Expo workflow will auto-restart and apply them.
      </Text>
    </ScrollView>
  );
}

function Row({ name, example, colors, set, valid }: any) {
  const icon = valid ? 'check-circle' : set ? 'alert-circle' : 'circle';
  const iconColor = valid ? colors.primary : set ? colors.warning : colors.textMuted;
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={iconColor} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={[styles.secretName, { color: colors.primary }]}>{name}</Text>
        <Text style={[styles.exampleText, { color: colors.textMuted }]}>e.g. {example}</Text>
      </View>
    </View>
  );
}

const STEPS = [
  'Go to supabase.com and open your project',
  'Click Project Settings → API',
  'Copy the Project URL (starts with https://)',
  'Copy the anon / public key',
  'Paste both into Replit Secrets and save',
];

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  iconBox: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    borderRadius: 10, borderWidth: 1, alignSelf: 'stretch',
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  code: { fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  bold: { fontFamily: 'Inter_600SemiBold' },
  codeBox: { borderWidth: 1, borderRadius: 12, alignSelf: 'stretch', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  rowIcon: { marginTop: 2 },
  rowText: { flex: 1, gap: 2 },
  secretName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  exampleText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  divider: { height: StyleSheet.hairlineWidth },
  steps: { borderWidth: 1, borderRadius: 12, alignSelf: 'stretch', padding: 16, gap: 12 },
  stepsTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 4 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  stepText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
});
