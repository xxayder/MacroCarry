import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { searchFood } from '@/lib/openFoodFacts';
import { supabase } from '@/lib/supabase';
import type { FoodLog, ManualFood, ParsedOFFProduct } from '@/types';
import { useQuery } from '@tanstack/react-query';

type ResultItem =
  | { type: 'recent'; log: FoodLog }
  | { type: 'manual'; food: ManualFood }
  | { type: 'off'; product: ParsedOFFProduct };

export default function FoodSearchScreen() {
  const { meal_type, date } = useLocalSearchParams<{ meal_type: string; date: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [offResults, setOffResults] = useState<ParsedOFFProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // Recent foods from history
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recent-foods', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) return [];
      // Deduplicate by food_name
      const seen = new Set<string>();
      return (data as FoodLog[]).filter((l) => {
        const key = l.food_name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 15);
    },
    enabled: !!user,
  });

  // Manual foods
  const { data: manualFoods = [] } = useQuery({
    queryKey: ['manual-foods', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('manual_foods').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data as ManualFood[];
    },
    enabled: !!user,
  });

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setOffLoading(true);
    setSearchDone(false);
    try {
      const results = await searchFood(query.trim());
      setOffResults(results);
    } catch {
      Alert.alert('Search failed', 'Could not reach Open Food Facts. Check your connection.');
    } finally {
      setOffLoading(false);
      setSearchDone(true);
    }
  }, [query]);

  const navToServing = (product: ParsedOFFProduct, source: 'open_food_facts' | 'manual') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/serving-picker',
      params: {
        meal_type, date,
        food_name: product.food_name,
        brand: product.brand ?? '',
        barcode: '',
        serving_size: product.serving_size,
        serving_unit: product.serving_unit,
        cal: product.per100g.calories,
        protein: product.per100g.protein_g,
        carbs: product.per100g.carbs_g,
        fat: product.per100g.fat_g,
        fiber: product.per100g.fiber_g,
        sugar: product.per100g.sugar_g,
        sodium: product.per100g.sodium_mg,
        source,
      },
    });
  };

  const navToServingFromLog = (log: FoodLog) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perG = log.grams && log.grams > 0
      ? {
          calories: (log.calories / log.grams) * 100,
          protein_g: (log.protein_g / log.grams) * 100,
          carbs_g: (log.carbs_g / log.grams) * 100,
          fat_g: (log.fat_g / log.grams) * 100,
          fiber_g: (log.fiber_g / log.grams) * 100,
          sugar_g: (log.sugar_g / log.grams) * 100,
          sodium_mg: (log.sodium_mg / log.grams) * 100,
        }
      : {
          calories: log.calories,
          protein_g: log.protein_g,
          carbs_g: log.carbs_g,
          fat_g: log.fat_g,
          fiber_g: log.fiber_g,
          sugar_g: log.sugar_g,
          sodium_mg: log.sodium_mg,
        };
    router.push({
      pathname: '/serving-picker',
      params: {
        meal_type, date,
        food_name: log.food_name,
        brand: log.brand ?? '',
        barcode: log.barcode ?? '',
        serving_size: log.grams && log.grams > 0 ? log.grams : log.serving_amount,
        serving_unit: 'g',
        cal: perG.calories,
        protein: perG.protein_g,
        carbs: perG.carbs_g,
        fat: perG.fat_g,
        fiber: perG.fiber_g,
        sugar: perG.sugar_g,
        sodium: perG.sodium_mg,
        source: 'copied',
      },
    });
  };

  const filteredRecent = query
    ? recentLogs.filter((l) => l.food_name.toLowerCase().includes(query.toLowerCase()))
    : recentLogs;

  const filteredManual = query
    ? manualFoods.filter((f) => f.food_name.toLowerCase().includes(query.toLowerCase()))
    : manualFoods;

  const sections: ResultItem[] = [
    ...filteredManual.slice(0, 5).map((f): ResultItem => ({ type: 'manual', food: f })),
    ...filteredRecent.slice(0, 10).map((l): ResultItem => ({ type: 'recent', log: l })),
    ...(searchDone ? offResults.map((p): ResultItem => ({ type: 'off', product: p })) : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods or barcodes..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setOffResults([]); setSearchDone(false); }}>
              <Feather name="x-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
          {query.trim().length > 0 && (
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary, opacity: offLoading ? 0.7 : 1 }]}
              onPress={handleSearch}
              disabled={offLoading}
            >
              {offLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item, i) =>
          item.type === 'recent' ? `r-${item.log.id}` : item.type === 'manual' ? `m-${item.food.id}` : `o-${i}`
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() =>
          sections.length === 0 ? (
            <View style={styles.emptyState}>
              {offLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : searchDone ? (
                <>
                  <Feather name="search" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No results found</Text>
                  <TouchableOpacity onPress={() => router.replace({ pathname: '/manual-food', params: { meal_type, date } })}>
                    <Text style={[styles.emptyAction, { color: colors.primary }]}>Add manually</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Feather name="clock" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                    {recentLogs.length === 0 ? 'No recent foods' : 'Type to search Open Food Facts'}
                  </Text>
                </>
              )}
            </View>
          ) : (
            <>
              {filteredManual.length > 0 && <SectionHeader label="MY FOODS" colors={colors} />}
            </>
          )
        }
        renderItem={({ item, index }) => {
          if (item.type === 'manual') {
            const f = item.food;
            const mealProd: ParsedOFFProduct = {
              food_name: f.food_name,
              brand: f.brand,
              serving_size: f.serving_size,
              serving_unit: f.serving_unit,
              per100g: {
                calories: (f.calories_per_serving / f.serving_size) * 100,
                protein_g: (f.protein_g_per_serving / f.serving_size) * 100,
                carbs_g: (f.carbs_g_per_serving / f.serving_size) * 100,
                fat_g: (f.fat_g_per_serving / f.serving_size) * 100,
                fiber_g: (f.fiber_g_per_serving / f.serving_size) * 100,
                sugar_g: (f.sugar_g_per_serving / f.serving_size) * 100,
                sodium_mg: (f.sodium_mg_per_serving / f.serving_size) * 100,
              },
            };
            return (
              <>
                <SearchResultRow
                  name={f.food_name}
                  sub={`${f.serving_size}${f.serving_unit}${f.brand ? ` · ${f.brand}` : ''}`}
                  cal={f.calories_per_serving}
                  badge="saved"
                  colors={colors}
                  onPress={() => navToServing(mealProd, 'manual')}
                />
                {index === filteredManual.length - 1 && filteredRecent.length > 0 && (
                  <SectionHeader label="RECENT" colors={colors} />
                )}
              </>
            );
          }
          if (item.type === 'recent') {
            const isLastRecent = index === filteredManual.length + filteredRecent.length - 1;
            return (
              <>
                <SearchResultRow
                  name={item.log.food_name}
                  sub={`${item.log.serving_amount}${item.log.serving_unit}${item.log.brand ? ` · ${item.log.brand}` : ''}`}
                  cal={item.log.calories}
                  badge="recent"
                  colors={colors}
                  onPress={() => navToServingFromLog(item.log)}
                />
                {isLastRecent && offResults.length > 0 && (
                  <SectionHeader label="OPEN FOOD FACTS" colors={colors} />
                )}
              </>
            );
          }
          return (
            <SearchResultRow
              name={item.product.food_name}
              sub={`per 100g${item.product.brand ? ` · ${item.product.brand}` : ''}`}
              cal={item.product.per100g.calories}
              badge="off"
              colors={colors}
              onPress={() => navToServing(item.product, 'open_food_facts')}
            />
          );
        }}
      />
    </View>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted, backgroundColor: colors.background }]}>{label}</Text>
  );
}

function SearchResultRow({ name, sub, cal, badge, colors, onPress }: any) {
  const badgeColors: Record<string, string> = { saved: colors.primary, recent: colors.textMuted, off: colors.carbs };
  const badgeLabels: Record<string, string> = { saved: 'Saved', recent: 'Recent', off: 'OFF' };

  return (
    <TouchableOpacity
      style={[styles.resultRow, { borderBottomColor: colors.borderMuted }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={styles.resultRight}>
        <View style={[styles.badge, { borderColor: badgeColors[badge] + '55' }]}>
          <Text style={[styles.badgeText, { color: badgeColors[badge] }]}>{badgeLabels[badge]}</Text>
        </View>
        <Text style={[styles.resultCal, { color: colors.text }]}>{Math.round(cal)}</Text>
        <Text style={[styles.resultCalUnit, { color: colors.textMuted }]}>kcal</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  searchBtn: { height: 34, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  sectionHeader: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, paddingHorizontal: 16, paddingVertical: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultInfo: { flex: 1, gap: 2 },
  resultName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  resultSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  resultRight: { alignItems: 'flex-end', gap: 2 },
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  resultCal: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  resultCalUnit: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  emptyState: { alignItems: 'center', gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  emptyAction: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
