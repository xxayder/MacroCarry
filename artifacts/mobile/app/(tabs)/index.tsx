import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/CalorieRing';
import { DateNavigator } from '@/components/DateNavigator';
import { MacroBar } from '@/components/MacroBar';
import { MealSection } from '@/components/MealSection';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import {
  calcCarryover,
  calcDailyTotals,
  last30Days,
  today,
} from '@/lib/utils';
import type { FoodLog, MealType } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function DashboardScreen() {
  const { profile } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());

  // Today's food logs
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['food-logs', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FoodLog[];
    },
    enabled: !!profile,
  });

  // Past 30 days for carryover
  const { data: pastDays = [] } = useQuery({
    queryKey: ['carryover-history'],
    queryFn: async () => {
      const days = last30Days();
      const { data, error } = await supabase
        .from('food_logs')
        .select('date, calories')
        .in('date', days);
      if (error) throw error;

      const grouped: Record<string, number> = {};
      for (const row of data as { date: string; calories: number }[]) {
        grouped[row.date] = (grouped[row.date] ?? 0) + row.calories;
      }
      return Object.entries(grouped).map(([d, calories]) => ({ date: d, calories }));
    },
    enabled: !!profile && !!profile.carryover_enabled,
    staleTime: 5 * 60 * 1000,
  });

  // 7-day avg
  const { data: weeklyAvg } = useQuery({
    queryKey: ['weekly-avg'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('date, calories')
        .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
      if (error) return null;
      const rows = data as { date: string; calories: number }[];
      if (!rows.length) return null;
      const byDay: Record<string, number> = {};
      rows.forEach((r) => { byDay[r.date] = (byDay[r.date] ?? 0) + r.calories; });
      const vals = Object.values(byDay);
      return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    },
    enabled: !!profile,
    staleTime: 10 * 60 * 1000,
  });

  const totals = calcDailyTotals(logs);
  const carryover = profile?.carryover_enabled
    ? Math.round(calcCarryover(pastDays, profile.daily_calorie_goal))
    : 0;

  const deleteLog = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('food_logs').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['food-logs', date] });
      queryClient.invalidateQueries({ queryKey: ['carryover-history'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-avg'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not remove food.');
    }
  }, [date, queryClient]);

  const isToday = date === today();

  if (!profile) return null;

  const goal = profile.daily_calorie_goal;
  const adjustedGoal = goal + carryover;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['carryover-history'] });
            queryClient.invalidateQueries({ queryKey: ['weekly-avg'] });
          }}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Date nav */}
      <View style={[styles.dateNav, { paddingTop: insets.top + 8 }]}>
        <DateNavigator date={date} onDateChange={setDate} />
      </View>

      {/* Calorie ring */}
      <View style={styles.ringSection}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <CalorieRing
            eaten={totals.calories}
            goal={goal}
            carryover={carryover}
            size={200}
          />
        )}
        <View style={styles.goalRow}>
          <View style={styles.goalStat}>
            <Text style={[styles.goalNum, { color: colors.text }]}>{adjustedGoal.toLocaleString()}</Text>
            <Text style={[styles.goalLabel, { color: colors.textMuted }]}>goal</Text>
          </View>
          {carryover !== 0 && (
            <View style={styles.goalStat}>
              <Text style={[styles.goalNum, { color: carryover >= 0 ? colors.primary : colors.destructive }]}>
                {carryover >= 0 ? '+' : ''}{carryover.toLocaleString()}
              </Text>
              <Text style={[styles.goalLabel, { color: colors.textMuted }]}>carryover</Text>
            </View>
          )}
          {weeklyAvg != null && (
            <View style={styles.goalStat}>
              <Text style={[styles.goalNum, { color: colors.text }]}>{weeklyAvg.toLocaleString()}</Text>
              <Text style={[styles.goalLabel, { color: colors.textMuted }]}>7d avg</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main macros */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.macroRow}>
          <MacroBar
            label="Protein"
            eaten={totals.protein_g}
            goal={profile.protein_goal_g}
            color={colors.protein}
          />
          <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
          <MacroBar
            label="Carbs"
            eaten={totals.carbs_g}
            goal={profile.carbs_goal_g}
            color={colors.carbs}
          />
          <View style={[styles.macroDivider, { backgroundColor: colors.border }]} />
          <MacroBar
            label="Fat"
            eaten={totals.fat_g}
            goal={profile.fat_goal_g}
            color={colors.fat}
          />
        </View>
      </View>

      {/* Extended macros */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.extendedRow}>
          <ExtStat
            label="Fiber"
            value={totals.fiber_g}
            goal={profile.fiber_goal_g}
            unit="g"
            color={colors.fiber}
            colors={colors}
          />
          <ExtStat
            label="Sugar"
            value={totals.sugar_g}
            goal={profile.sugar_goal_g}
            unit="g"
            color={colors.sugar}
            colors={colors}
          />
          <ExtStat
            label="Sodium"
            value={totals.sodium_mg}
            goal={profile.sodium_goal_mg}
            unit="mg"
            color={colors.sodium}
            colors={colors}
          />
        </View>
      </View>

      {/* Meals */}
      <View style={styles.meals}>
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            mealType={meal}
            logs={logs.filter((l) => l.meal_type === meal)}
            date={date}
            onDelete={deleteLog}
            readonly={!isToday}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function ExtStat({ label, value, goal, unit, color, colors }: any) {
  const over = value > goal;
  return (
    <View style={styles.extStat}>
      <Text style={[styles.extVal, { color: over ? colors.destructive : color }]}>
        {Math.round(value)}
        <Text style={[styles.extUnit, { color: colors.textMuted }]}>{unit}</Text>
      </Text>
      <Text style={[styles.extLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.extGoal, { color: colors.textMuted }]}>/{goal}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 12, paddingHorizontal: 16 },
  dateNav: { paddingBottom: 4 },
  ringSection: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  goalRow: { flexDirection: 'row', gap: 24, justifyContent: 'center' },
  goalStat: { alignItems: 'center', gap: 2 },
  goalNum: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  goalLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  macroRow: { flexDirection: 'row', gap: 0 },
  macroDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 12, alignSelf: 'stretch' },
  extendedRow: { flexDirection: 'row', justifyContent: 'space-around' },
  extStat: { alignItems: 'center', gap: 3 },
  extVal: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  extUnit: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  extLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  extGoal: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  meals: { gap: 10 },
});
