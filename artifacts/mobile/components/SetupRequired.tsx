import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

export function SetupRequired() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
        <Feather name="alert-circle" size={40} color={colors.warning} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Supabase Setup Required</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Set the following environment variables in your Replit Secrets:
      </Text>
      <View style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.code, { color: colors.primary }]}>EXPO_PUBLIC_SUPABASE_URL</Text>
        <Text style={[styles.code, { color: colors.primary }]}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        See README.md for full Supabase setup instructions.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  iconBox: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  codeBox: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 8, alignSelf: 'stretch' },
  code: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
