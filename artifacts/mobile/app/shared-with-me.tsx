import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealSection } from '@/components/MealSection';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { today } from '@/lib/utils';
import type { FoodLog, MealType, SharePermission } from '@/types';
import { useQuery } from '@tanstack/react-query';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function SharedWithMeScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; email: string } | null>(null);

  // Who shared with me
  const { data: sharedByMe = [], isLoading: sharesLoading } = useQuery({
    queryKey: ['shared-with-me', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_permissions')
        .select('*')
        .eq('shared_with_email', user!.email ?? '');
      if (error) throw error;
      return data as SharePermission[];
    },
    enabled: !!user?.email,
  });

  // Selected owner's logs (today)
  const { data: ownerLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['shared-logs', selectedOwner?.id, today()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', selectedOwner!.id)
        .eq('date', today())
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FoodLog[];
    },
    enabled: !!selectedOwner,
  });

  if (selectedOwner) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedOwner(null)} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{selectedOwner.email}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Today's log (read-only)</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>
        {logsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={[styles.logsContent, { paddingBottom: insets.bottom + 20 }]}>
            {MEALS.map((meal) => (
              <MealSection
                key={meal}
                mealType={meal}
                logs={ownerLogs.filter((l) => l.meal_type === meal)}
                date={today()}
                onDelete={() => {}}
                readonly
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Shared With Me</Text>
        <View style={{ width: 34 }} />
      </View>

      {sharesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : sharedByMe.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="eye-off" size={44} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No logs shared with you</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            Ask someone to share their food log with your email: {user?.email}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sharedByMe}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.ownerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedOwner({ id: item.owner_id, email: item.shared_with_email.replace(item.shared_with_email, item.owner_id) })}
              activeOpacity={0.7}
            >
              <View style={[styles.ownerAvatar, { backgroundColor: colors.primarySubtle }]}>
                <Feather name="user" size={20} color={colors.primary} />
              </View>
              <View style={styles.ownerInfo}>
                <Text style={[styles.ownerEmail, { color: colors.text }]}>Owner ID: {item.owner_id.slice(0, 8)}…</Text>
                <Text style={[styles.ownerSub, { color: colors.textMuted }]}>Shared food log</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListHeaderComponent={() => (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Tap a person to view their today's food log.
            </Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  logsContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  emptyBody: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  desc: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ownerInfo: { flex: 1 },
  ownerEmail: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  ownerSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
