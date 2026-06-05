import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateNavigator } from '@/components/DateNavigator';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { mealLabel, subtractDays, today } from '@/lib/utils';
import type { FoodLog } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function CopyDayScreen() {
  const { meal_type, date } = useLocalSearchParams<{ meal_type: string; date: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [sourceDate, setSourceDate] = useState(subtractDays(date ?? today(), 1));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);

  const { data: sourceLogs = [], isLoading } = useQuery({
    queryKey: ['copy-day-logs', sourceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('date', sourceDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FoodLog[];
    },
    enabled: !!user,
  });

  const toggleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === sourceLogs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sourceLogs.map((l) => l.id)));
    }
  };

  const handleCopy = async () => {
    if (selected.size === 0) {
      Alert.alert('No foods selected', 'Select at least one food to copy.');
      return;
    }
    setCopying(true);
    try {
      const toCopy = sourceLogs.filter((l) => selected.has(l.id));
      const inserts = toCopy.map(({ id: _id, created_at: _c, ...rest }) => ({
        ...rest,
        user_id: user!.id,
        date: date ?? today(),
        meal_type: meal_type ?? rest.meal_type,
        source: 'copied' as const,
      }));
      const { error } = await supabase.from('food_logs').insert(inserts);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['food-logs', date ?? today()] });
      queryClient.invalidateQueries({ queryKey: ['carryover-history'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-avg'] });
      router.dismissAll();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Copy failed.');
    } finally {
      setCopying(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Copy Foods</Text>
          <TouchableOpacity onPress={selectAll} disabled={sourceLogs.length === 0}>
            <Text style={[styles.selectAll, { color: colors.primary }]}>
              {selected.size === sourceLogs.length && sourceLogs.length > 0 ? 'Deselect all' : 'Select all'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dateNav}>
          <DateNavigator date={sourceDate} onDateChange={(d) => { setSourceDate(d); setSelected(new Set()); }} />
        </View>
        <Text style={[styles.copyTarget, { color: colors.textSecondary }]}>
          Copying to: {meal_type ? mealLabel(meal_type) + ' on ' : ''}{date ?? today()}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : sourceLogs.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing logged on this day</Text>
        </View>
      ) : (
        <FlatList
          data={sourceLogs}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.id);
            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.borderMuted, backgroundColor: isSelected ? colors.primarySubtle : 'transparent' }]}
                onPress={() => toggleSelect(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                  {isSelected && <Feather name="check" size={12} color="#fff" />}
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.food_name}</Text>
                  <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                    {mealLabel(item.meal_type)} · {item.serving_amount}{item.serving_unit}
                  </Text>
                </View>
                <Text style={[styles.rowCal, { color: colors.text }]}>{Math.round(item.calories)} kcal</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {selected.size > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: colors.primary, opacity: copying ? 0.7 : 1 }]}
            onPress={handleCopy}
            disabled={copying}
            activeOpacity={0.8}
          >
            {copying ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.copyBtnText}>Copy {selected.size} Food{selected.size > 1 ? 's' : ''}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  selectAll: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  dateNav: {},
  copyTarget: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  rowCal: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  copyBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copyBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
