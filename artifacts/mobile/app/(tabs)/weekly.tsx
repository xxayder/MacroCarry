import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { last7Days, parseDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

export default function WeeklyScreen() {
  const { profile } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const days = last7Days();

  const { data: weeklyData, isLoading } = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('date, calories, protein_g, carbs_g, fat_g')
        .in('date', days);
      if (error) throw error;

      const grouped: Record<string, { calories: number; protein_g: number; carbs_g: number; fat_g: number }> = {};
      days.forEach((d) => { grouped[d] = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }; });
      (data as any[]).forEach((r) => {
        if (grouped[r.date]) {
          grouped[r.date].calories += r.calories;
          grouped[r.date].protein_g += r.protein_g;
          grouped[r.date].carbs_g += r.carbs_g;
          grouped[r.date].fat_g += r.fat_g;
        }
      });
      return grouped;
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000,
  });

  if (!profile) return null;

  const goal = profile.daily_calorie_goal;
  const dayData = days.map((d) => ({ date: d, ...(weeklyData?.[d] ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }) }));
  const logged = dayData.filter((d) => d.calories > 0);
  const avgCal = logged.length ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length) : 0;
  const avgPro = logged.length ? Math.round(logged.reduce((s, d) => s + d.protein_g, 0) / logged.length) : 0;
  const avgCarb = logged.length ? Math.round(logged.reduce((s, d) => s + d.carbs_g, 0) / logged.length) : 0;
  const avgFat = logged.length ? Math.round(logged.reduce((s, d) => s + d.fat_g, 0) / logged.length) : 0;
  const maxCal = Math.max(...dayData.map((d) => d.calories), goal);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Weekly Summary</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Bar chart */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>CALORIES PER DAY</Text>
            <View style={styles.chartArea}>
              {dayData.map((day) => {
                const barH = maxCal > 0 ? Math.round((day.calories / maxCal) * 100) : 0;
                const isOver = day.calories > goal;
                const dayLetter = parseDate(day.date).toLocaleDateString('en-US', { weekday: 'narrow' });
                return (
                  <View key={day.date} style={styles.barCol}>
                    <Text style={[styles.barCal, { color: colors.textSecondary }]}>
                      {day.calories > 0 ? Math.round(day.calories) : ''}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.progressBg }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${barH}%` as any,
                            backgroundColor: isOver ? colors.destructive : colors.primary,
                          },
                        ]}
                      />
                      {/* Goal line */}
                      <View
                        style={[
                          styles.goalLine,
                          {
                            bottom: `${Math.round((goal / maxCal) * 100)}%` as any,
                            backgroundColor: colors.textMuted,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textMuted }]}>{dayLetter}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Averages */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>7-DAY AVERAGES</Text>
            <View style={styles.statsGrid}>
              <AvgStat label="Calories" value={avgCal} goal={goal} unit="kcal" colors={colors} />
              <AvgStat label="Protein" value={avgPro} goal={profile.protein_goal_g} unit="g" color={colors.protein} colors={colors} />
              <AvgStat label="Carbs" value={avgCarb} goal={profile.carbs_goal_g} unit="g" color={colors.carbs} colors={colors} />
              <AvgStat label="Fat" value={avgFat} goal={profile.fat_goal_g} unit="g" color={colors.fat} colors={colors} />
            </View>
          </View>

          {/* Day breakdown */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>BREAKDOWN</Text>
            {dayData.map((day) => {
              const diff = day.calories - goal;
              const dayName = parseDate(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <View key={day.date} style={[styles.dayRow, { borderBottomColor: colors.borderMuted }]}>
                  <Text style={[styles.dayName, { color: colors.text }]}>{dayName}</Text>
                  <View style={styles.dayRight}>
                    <Text style={[styles.dayCal, { color: colors.text }]}>
                      {day.calories > 0 ? Math.round(day.calories) : '—'}
                    </Text>
                    {day.calories > 0 && (
                      <Text style={[styles.dayDiff, { color: diff > 0 ? colors.destructive : colors.primary }]}>
                        {diff > 0 ? '+' : ''}{Math.round(diff)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function AvgStat({ label, value, goal, unit, color, colors }: any) {
  const pct = goal > 0 ? Math.round((value / goal) * 100) : 0;
  const isOver = value > goal;
  return (
    <View style={styles.avgStat}>
      <Text style={[styles.avgVal, { color: color ?? (isOver ? colors.destructive : colors.text) }]}>
        {value}{unit === 'kcal' ? '' : unit === 'g' ? 'g' : 'mg'}
      </Text>
      {unit === 'kcal' && <Text style={[styles.avgUnit, { color: colors.textMuted }]}>kcal</Text>}
      <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.avgGoal, { color: colors.textMuted }]}>
        {pct}% of goal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  cardTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  chartArea: { flexDirection: 'row', gap: 6, height: 140, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barCal: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  barTrack: { flex: 1, width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end', position: 'relative' },
  barFill: { width: '100%', borderRadius: 4 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1.5, opacity: 0.5 },
  barLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  avgStat: { width: '50%', padding: 8, gap: 2 },
  avgVal: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  avgUnit: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: -4 },
  avgLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  avgGoal: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  dayName: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayCal: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  dayDiff: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
