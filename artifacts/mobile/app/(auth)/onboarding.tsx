import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { validateMacros } from '@/lib/utils';

export default function OnboardingScreen() {
  const { updateProfile, user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('225');
  const [fat, setFat] = useState('65');
  const [fiber, setFiber] = useState('25');
  const [sugar, setSugar] = useState('50');
  const [sodium, setSodium] = useState('2300');

  const handleSave = async () => {
    const cal = Number(calories);
    const pro = Number(protein);
    const car = Number(carbs);
    const fa = Number(fat);

    if (!cal || !pro || !car || !fa) {
      Alert.alert('Missing fields', 'Please fill in all required macro goals.');
      return;
    }

    const { warning } = validateMacros(cal, pro, car, fa);

    const proceed = async () => {
      setSaving(true);
      try {
        await updateProfile({
          email: user?.email ?? '',
          display_name: user?.user_metadata?.full_name ?? null,
          daily_calorie_goal: cal,
          protein_goal_g: pro,
          carbs_goal_g: car,
          fat_goal_g: fa,
          fiber_goal_g: Number(fiber) || 25,
          sugar_goal_g: Number(sugar) || 50,
          sodium_goal_mg: Number(sodium) || 2300,
          carryover_enabled: true,
        });
        router.replace('/(tabs)/');
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Could not save goals.');
      } finally {
        setSaving(false);
      }
    };

    if (warning) {
      Alert.alert('Macro Warning', warning, [
        { text: 'Adjust', style: 'cancel' },
        { text: 'Save Anyway', onPress: proceed },
      ]);
    } else {
      proceed();
    }
  };

  const macroCalories = Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Feather name="target" size={32} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Set your daily goals</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            You can change these anytime in Settings.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CALORIES</Text>
          <NumberField
            label="Daily Calorie Goal"
            value={calories}
            onChange={setCalories}
            unit="kcal"
            colors={colors}
          />
          {Number(calories) > 0 && Number(protein) > 0 && (
            <View style={[styles.macroHint, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.macroHintText, { color: colors.primary }]}>
                Macro calories: {Math.round(macroCalories)} kcal
                {Math.abs(macroCalories - Number(calories)) > 100
                  ? ` (${Math.round(Math.abs(macroCalories - Number(calories)))} off)`
                  : ' ✓'}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MACROS</Text>
          <NumberField label="Protein" value={protein} onChange={setProtein} unit="g" colors={colors} hint="4 kcal/g" />
          <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />
          <NumberField label="Carbohydrates" value={carbs} onChange={setCarbs} unit="g" colors={colors} hint="4 kcal/g" />
          <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />
          <NumberField label="Fat" value={fat} onChange={setFat} unit="g" colors={colors} hint="9 kcal/g" />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OPTIONAL GOALS</Text>
          <NumberField label="Fiber" value={fiber} onChange={setFiber} unit="g" colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />
          <NumberField label="Sugar" value={sugar} onChange={setSugar} unit="g" colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />
          <NumberField label="Sodium" value={sodium} onChange={setSodium} unit="mg" colors={colors} />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save & Start Tracking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  hint?: string;
  colors: any;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLeft}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholderTextColor={colors.textMuted}
          placeholder="0"
        />
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { paddingHorizontal: 20, gap: 16 },
  header: { alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  section: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', gap: 0 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  macroHint: { marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 8 },
  macroHintText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLeft: { flex: 1, gap: 2 },
  fieldLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  fieldHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 4,
  },
  input: { fontSize: 15, fontFamily: 'Inter_500Medium', minWidth: 50, textAlign: 'right' },
  unit: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
