import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  eaten: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, eaten, goal, color, unit = 'g' }: Props) {
  const colors = useColors();
  const progress = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const isOver = eaten > goal;
  const remaining = Math.max(goal - eaten, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.nums}>
          <Text style={[styles.eaten, { color: colors.text }]}>
            {Math.round(eaten)}
          </Text>
          <Text style={[styles.slash, { color: colors.textMuted }]}>/{goal}{unit}</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.progressBg }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%` as any,
              backgroundColor: isOver ? colors.destructive : color,
            },
          ]}
        />
      </View>
      <Text style={[styles.remaining, { color: colors.textMuted }]}>
        {isOver ? `${Math.round(eaten - goal)}${unit} over` : `${Math.round(remaining)}${unit} left`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  nums: { flexDirection: 'row', alignItems: 'baseline' },
  eaten: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  slash: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  remaining: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});
