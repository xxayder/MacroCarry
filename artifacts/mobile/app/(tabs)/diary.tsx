import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateNavigator } from '@/components/DateNavigator';
import { MealSection } from '@/components/MealSection';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { subtractDays, today } from '@/lib/utils';
import type { FoodLog, MealType } from '@/types';
import { useQuery } from '@tanstack/react-query';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function DiaryScreen() {
  const { profile } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(subtractDays(today(), 1));

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['diary-logs', date],
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

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80, paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.dateNav}>
        <DateNavigator date={date} onDateChange={setDate} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.meals}>
          {MEALS.map((meal) => (
            <MealSection
              key={meal}
              mealType={meal}
              logs={logs.filter((l) => l.meal_type === meal)}
              date={date}
              onDelete={() => {}}
              readonly
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  dateNav: { paddingBottom: 4 },
  meals: { gap: 10 },
});
