import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Svg } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';

interface Props {
  eaten: number;
  goal: number;
  carryover?: number;
  size?: number;
}

export function CalorieRing({ eaten, goal, carryover = 0, size = 200 }: Props) {
  const colors = useColors();
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const adjustedGoal = Math.max(goal + carryover, 1);
  const progress = Math.min(eaten / adjustedGoal, 1);
  const isOver = eaten > adjustedGoal;

  const strokeDashoffset = circumference * (1 - progress);
  const ringColor = isOver ? colors.destructive : colors.primary;

  const remaining = Math.round(adjustedGoal - eaten);
  const remaining_abs = Math.abs(remaining);
  const remainingLabel = isOver ? 'over' : 'left';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.progressBg}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.eatenNum, { color: colors.text }]}>
          {Math.round(eaten).toLocaleString()}
        </Text>
        <Text style={[styles.eatenLabel, { color: colors.textSecondary }]}>eaten</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.remainNum, { color: isOver ? colors.destructive : colors.primary }]}>
          {remaining_abs.toLocaleString()}
        </Text>
        <Text style={[styles.remainLabel, { color: colors.textSecondary }]}>{remainingLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute' },
  center: { alignItems: 'center', gap: 1 },
  eatenNum: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  eatenLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  divider: { width: 30, height: 1, marginVertical: 4 },
  remainNum: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  remainLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
