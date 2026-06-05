import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { calcNutrition, ozToGrams } from '@/lib/openFoodFacts';
import { useQueryClient } from '@tanstack/react-query';

export default function ServingPickerScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(String(params.serving_size ?? '100'));
  const [unit, setUnit] = useState<'g' | 'oz'>(params.serving_unit === 'oz' ? 'oz' : 'g');
  const [saving, setSaving] = useState(false);

  const per100g = {
    calories: Number(params.cal ?? 0),
    protein_g: Number(params.protein ?? 0),
    carbs_g: Number(params.carbs ?? 0),
    fat_g: Number(params.fat ?? 0),
    fiber_g: Number(params.fiber ?? 0),
    sugar_g: Number(params.sugar ?? 0),
    sodium_mg: Number(params.sodium ?? 0),
  };

  const grams = unit === 'oz' ? ozToGrams(Number(amount) || 0) : Number(amount) || 0;
  const nutrition = calcNutrition(per100g, grams);

  const handleLog = async () => {
    if (!user || grams <= 0) {
      Alert.alert('Invalid serving', 'Please enter a valid serving amount.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('food_logs').insert({
        user_id: user.id,
        date: params.date,
        meal_type: params.meal_type,
        food_name: params.food_name,
        brand: params.brand || null,
        barcode: params.barcode || null,
        serving_amount: Number(amount),
        serving_unit: unit,
        grams,
        ...nutrition,
        source: params.source ?? 'open_food_facts',
      });
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['food-logs', params.date] });
      queryClient.invalidateQueries({ queryKey: ['carryover-history'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-avg'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary'] });
      router.dismissAll();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not log food.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{params.food_name}</Text>
      </View>
      {params.brand ? <Text style={[styles.brand, { color: colors.textSecondary }]}>{params.brand}</Text> : null}

      {/* Serving input */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>SERVING SIZE</Text>
        <View style={styles.servingRow}>
          <TextInput
            style={[styles.servingInput, { color: colors.text, borderColor: colors.primary }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <View style={[styles.unitToggle, { backgroundColor: colors.progressBg }]}>
            {(['g', 'oz'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, unit === u && { backgroundColor: colors.primary }]}
                onPress={() => setUnit(u)}
              >
                <Text style={[styles.unitBtnText, { color: unit === u ? '#fff' : colors.textSecondary }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {unit === 'oz' && (
          <Text style={[styles.conversionHint, { color: colors.textMuted }]}>
            = {grams.toFixed(1)}g
          </Text>
        )}
      </View>

      {/* Nutrition preview */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>NUTRITION (for {amount}{unit})</Text>
        <View style={styles.calRow}>
          <Text style={[styles.calNum, { color: colors.text }]}>{Math.round(nutrition.calories)}</Text>
          <Text style={[styles.calUnit, { color: colors.textSecondary }]}>kcal</Text>
        </View>
        <View style={styles.macroGrid}>
          <NutrRow label="Protein" value={nutrition.protein_g} unit="g" color={colors.protein} colors={colors} />
          <NutrRow label="Carbs" value={nutrition.carbs_g} unit="g" color={colors.carbs} colors={colors} />
          <NutrRow label="Fat" value={nutrition.fat_g} unit="g" color={colors.fat} colors={colors} />
          <NutrRow label="Fiber" value={nutrition.fiber_g} unit="g" color={colors.fiber} colors={colors} />
          <NutrRow label="Sugar" value={nutrition.sugar_g} unit="g" color={colors.sugar} colors={colors} />
          <NutrRow label="Sodium" value={nutrition.sodium_mg} unit="mg" color={colors.sodium} colors={colors} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={handleLog}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Feather name="plus-circle" size={18} color="#fff" />
            <Text style={styles.logBtnText}>Add to Log</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function NutrRow({ label, value, unit, color, colors }: any) {
  return (
    <View style={styles.nutrRow}>
      <View style={[styles.nutrDot, { backgroundColor: color }]} />
      <Text style={[styles.nutrLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.nutrVal, { color: colors.text }]}>{Math.round(value * 10) / 10}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  brand: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: -8 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  cardLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  servingRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  servingInput: {
    flex: 1,
    height: 52,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  unitToggle: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  unitBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  conversionHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  calNum: { fontSize: 40, fontFamily: 'Inter_700Bold' },
  calUnit: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  macroGrid: { gap: 8 },
  nutrRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nutrDot: { width: 8, height: 8, borderRadius: 4 },
  nutrLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
  nutrVal: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  logBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
