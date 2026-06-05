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
import { useQueryClient } from '@tanstack/react-query';

export default function ManualFoodScreen() {
  const { meal_type, date, barcode: barcodeParam } = useLocalSearchParams<{
    meal_type: string; date: string; barcode?: string;
  }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [foodName, setFoodName] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState(barcodeParam ?? '');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState<'g' | 'oz'>('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (logNow: boolean) => {
    if (!foodName.trim() || !calories) {
      Alert.alert('Missing info', 'Food name and calories are required.');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const manualFood = {
        user_id: user.id,
        food_name: foodName.trim(),
        brand: brand.trim() || null,
        barcode: barcode.trim() || null,
        serving_size: Number(servingSize) || 100,
        serving_unit: servingUnit,
        calories_per_serving: Number(calories) || 0,
        protein_g_per_serving: Number(protein) || 0,
        carbs_g_per_serving: Number(carbs) || 0,
        fat_g_per_serving: Number(fat) || 0,
        fiber_g_per_serving: Number(fiber) || 0,
        sugar_g_per_serving: Number(sugar) || 0,
        sodium_mg_per_serving: Number(sodium) || 0,
      };

      const { error: mErr } = await supabase.from('manual_foods').insert(manualFood);
      if (mErr) throw mErr;

      if (logNow) {
        const grams = servingUnit === 'oz'
          ? (Number(servingSize) || 100) * 28.3495
          : Number(servingSize) || 100;
        const { error: lErr } = await supabase.from('food_logs').insert({
          user_id: user.id,
          date,
          meal_type,
          food_name: foodName.trim(),
          brand: brand.trim() || null,
          barcode: barcode.trim() || null,
          serving_amount: Number(servingSize) || 100,
          serving_unit: servingUnit,
          grams,
          calories: Number(calories) || 0,
          protein_g: Number(protein) || 0,
          carbs_g: Number(carbs) || 0,
          fat_g: Number(fat) || 0,
          fiber_g: Number(fiber) || 0,
          sugar_g: Number(sugar) || 0,
          sodium_mg: Number(sodium) || 0,
          source: 'manual',
        });
        if (lErr) throw lErr;
        queryClient.invalidateQueries({ queryKey: ['food-logs', date] });
        queryClient.invalidateQueries({ queryKey: ['carryover-history'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-avg'] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.dismissAll();
      } else {
        queryClient.invalidateQueries({ queryKey: ['manual-foods', user.id] });
        Alert.alert('Saved', 'Food saved to your database.');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save food.');
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
        <Text style={[styles.title, { color: colors.text }]}>Manual Entry</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FOOD INFO</Text>
        <Field label="Food Name *" value={foodName} onChange={setFoodName} placeholder="e.g. Greek Yogurt" colors={colors} />
        <Div colors={colors} />
        <Field label="Brand" value={brand} onChange={setBrand} placeholder="Optional" colors={colors} />
        <Div colors={colors} />
        <Field label="Barcode" value={barcode} onChange={setBarcode} placeholder="Optional" keyboardType="numeric" colors={colors} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SERVING SIZE</Text>
        <View style={styles.servingRow}>
          <View style={styles.servingInput}>
            <Field label="Amount" value={servingSize} onChange={setServingSize} keyboardType="decimal-pad" colors={colors} />
          </View>
          <View style={[styles.unitToggle, { backgroundColor: colors.progressBg }]}>
            {(['g', 'oz'] as const).map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, servingUnit === u && { backgroundColor: colors.primary }]}
                onPress={() => setServingUnit(u)}
              >
                <Text style={[styles.unitBtnText, { color: servingUnit === u ? '#fff' : colors.textSecondary }]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NUTRITION PER SERVING</Text>
        <Field label="Calories *" value={calories} onChange={setCalories} unit="kcal" keyboardType="numeric" colors={colors} />
        <Div colors={colors} />
        <Field label="Protein" value={protein} onChange={setProtein} unit="g" keyboardType="decimal-pad" colors={colors} />
        <Div colors={colors} />
        <Field label="Carbohydrates" value={carbs} onChange={setCarbs} unit="g" keyboardType="decimal-pad" colors={colors} />
        <Div colors={colors} />
        <Field label="Fat" value={fat} onChange={setFat} unit="g" keyboardType="decimal-pad" colors={colors} />
        <Div colors={colors} />
        <Field label="Fiber" value={fiber} onChange={setFiber} unit="g" keyboardType="decimal-pad" colors={colors} />
        <Div colors={colors} />
        <Field label="Sugar" value={sugar} onChange={setSugar} unit="g" keyboardType="decimal-pad" colors={colors} />
        <Div colors={colors} />
        <Field label="Sodium" value={sodium} onChange={setSodium} unit="mg" keyboardType="decimal-pad" colors={colors} />
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={() => handleSave(true)}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Feather name="plus-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Save & Log Now</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        onPress={() => handleSave(false)}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, { color: colors.text }]}>Save to My Foods Only</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, unit, keyboardType, colors }: any) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.fieldRight}>
        <TextInput
          style={[styles.fieldInput, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType ?? 'default'}
        />
        {unit && <Text style={[styles.fieldUnit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>
    </View>
  );
}

function Div({ colors }: any) {
  return <View style={[styles.divider, { backgroundColor: colors.borderMuted, marginHorizontal: 16 }]} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  section: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  fieldLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  fieldRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldInput: { textAlign: 'right', fontSize: 14, fontFamily: 'Inter_500Medium', minWidth: 60 },
  fieldUnit: { fontSize: 12, fontFamily: 'Inter_400Regular', minWidth: 24 },
  divider: { height: StyleSheet.hairlineWidth },
  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  servingInput: { flex: 1 },
  unitToggle: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  unitBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  btn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
