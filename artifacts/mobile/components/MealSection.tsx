import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FoodRow } from '@/components/FoodRow';
import { useColors } from '@/hooks/useColors';
import type { FoodLog, MealType } from '@/types';
import { mealLabel } from '@/lib/utils';

interface Props {
  mealType: MealType;
  logs: FoodLog[];
  date: string;
  onDelete: (id: string) => void;
  readonly?: boolean;
}

export function MealSection({ mealType, logs, date, onDelete, readonly = false }: Props) {
  const colors = useColors();
  const totalCal = logs.reduce((s, l) => s + l.calories, 0);

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/add-food', params: { meal_type: mealType, date } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{mealLabel(mealType)}</Text>
          {logs.length > 0 && (
            <Text style={[styles.totalCal, { color: colors.textSecondary }]}>
              {Math.round(totalCal)} kcal
            </Text>
          )}
        </View>
        {!readonly && (
          <TouchableOpacity onPress={handleAdd} style={styles.addBtn} hitSlop={8}>
            <Feather name="plus" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {logs.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyRow}
          onPress={!readonly ? handleAdd : undefined}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {readonly ? 'Nothing logged' : 'Tap + to add food'}
          </Text>
        </TouchableOpacity>
      ) : (
        logs.map((log) => (
          <FoodRow key={log.id} log={log} onDelete={readonly ? undefined : onDelete} readonly={readonly} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  totalCal: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  addBtn: { padding: 4 },
  emptyRow: { paddingHorizontal: 16, paddingVertical: 14 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
