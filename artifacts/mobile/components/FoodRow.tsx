import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import type { FoodLog } from '@/types';

interface Props {
  log: FoodLog;
  onDelete?: (id: string) => void;
  readonly?: boolean;
}

export function FoodRow({ log, onDelete, readonly = false }: Props) {
  const colors = useColors();

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Remove food?', `Remove ${log.food_name} from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onDelete?.(log.id),
      },
    ]);
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.borderMuted }]}>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {log.food_name}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {log.serving_amount}{log.serving_unit}
          {log.brand ? ` · ${log.brand}` : ''}
        </Text>
        <View style={styles.macros}>
          <MacroChip label="P" value={log.protein_g} color={colors.protein} />
          <MacroChip label="C" value={log.carbs_g} color={colors.carbs} />
          <MacroChip label="F" value={log.fat_g} color={colors.fat} />
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.cal, { color: colors.text }]}>{Math.round(log.calories)}</Text>
        <Text style={[styles.calLabel, { color: colors.textMuted }]}>kcal</Text>
        {!readonly && onDelete && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
            <Feather name="x" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.chip, { borderColor: color + '44' }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={[styles.chipVal, { color }]}>{Math.round(value)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  macros: { flexDirection: 'row', gap: 4, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    gap: 2,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  chipLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  chipVal: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  right: { alignItems: 'flex-end', gap: 1, minWidth: 50 },
  cal: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  calLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  deleteBtn: { marginTop: 4, padding: 2 },
});
