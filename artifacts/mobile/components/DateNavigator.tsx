import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { addDays, formatDisplayDate, today } from '@/lib/utils';

interface Props {
  date: string;
  onDateChange: (date: string) => void;
}

export function DateNavigator({ date, onDateChange }: Props) {
  const colors = useColors();
  const isToday = date === today();

  const goBack = () => {
    Haptics.selectionAsync();
    onDateChange(addDays(date, -1));
  };

  const goForward = () => {
    if (isToday) return;
    Haptics.selectionAsync();
    onDateChange(addDays(date, 1));
  };

  const goToday = () => {
    if (isToday) return;
    Haptics.selectionAsync();
    onDateChange(today());
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goBack} style={styles.arrow} hitSlop={12}>
        <Feather name="chevron-left" size={22} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={goToday} style={styles.center} disabled={isToday} activeOpacity={isToday ? 1 : 0.7}>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {formatDisplayDate(date)}
        </Text>
        {!isToday && (
          <Text style={[styles.todayHint, { color: colors.primary }]}>Tap to go to today</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={goForward}
        style={[styles.arrow, { opacity: isToday ? 0.3 : 1 }]}
        disabled={isToday}
        hitSlop={12}
      >
        <Feather name="chevron-right" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  arrow: { padding: 8 },
  center: { flex: 1, alignItems: 'center', gap: 2 },
  dateText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  todayHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
