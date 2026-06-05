import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import type { MealType } from '@/types';
import { mealLabel } from '@/lib/utils';

const OPTIONS = [
  { icon: 'search', label: 'Search foods', route: '/food-search' },
  { icon: 'camera', label: 'Scan barcode', route: '/scanner' },
  { icon: 'edit-3', label: 'Manual entry', route: '/manual-food' },
  { icon: 'calendar', label: 'Copy from previous day', route: '/copy-day' },
];

export default function AddFoodScreen() {
  const { meal_type, date } = useLocalSearchParams<{ meal_type: string; date: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleOption = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: route as any, params: { meal_type, date } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Add to {mealLabel(meal_type ?? 'breakfast')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.route}
            style={[styles.optRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleOption(opt.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.optIcon, { backgroundColor: colors.primarySubtle }]}>
              <Feather name={opt.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.optLabel, { color: colors.text }]}>{opt.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  options: { gap: 10 },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
});
