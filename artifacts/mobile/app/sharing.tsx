import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import type { SharePermission } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function SharingScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ['share-permissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_permissions')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SharePermission[];
    },
    enabled: !!user,
  });

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (trimmed === user?.email) {
      Alert.alert('Invalid', 'You cannot share with yourself.');
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from('share_permissions').insert({
        owner_id: user!.id,
        shared_with_email: trimmed,
      });
      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already shared', 'You already share with this email.');
        } else {
          throw error;
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEmail('');
        queryClient.invalidateQueries({ queryKey: ['share-permissions', user?.id] });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not add share.');
    } finally {
      setAdding(false);
    }
  };

  const handleRevoke = (share: SharePermission) => {
    Alert.alert('Revoke access?', `Remove ${share.shared_with_email}'s access to your food log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('share_permissions').delete().eq('id', share.id);
            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            queryClient.invalidateQueries({ queryKey: ['share-permissions', user?.id] });
          } catch (err: any) {
            Alert.alert('Error', err.message ?? 'Could not revoke.');
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Share My Log</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          People you share with can view your food log in read-only mode. They cannot edit or add foods.
        </Text>

        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.emailInput, { color: colors.text }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Share</Text>}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SHARED WITH</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : shares.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No one has access yet</Text>
          </View>
        ) : (
          <FlatList
            data={shares}
            keyExtractor={(s) => s.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.shareRow, { borderBottomColor: colors.borderMuted }]}>
                <View style={[styles.shareAvatar, { backgroundColor: colors.primarySubtle }]}>
                  <Text style={[styles.shareAvatarText, { color: colors.primary }]}>
                    {item.shared_with_email.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.shareEmail, { color: colors.text }]} numberOfLines={1}>
                  {item.shared_with_email}
                </Text>
                <TouchableOpacity onPress={() => handleRevoke(item)} hitSlop={10}>
                  <Feather name="user-minus" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
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
  title: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  desc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    height: 48,
  },
  emailInput: { flex: 1, paddingHorizontal: 14, fontSize: 14, fontFamily: 'Inter_400Regular' },
  addBtn: { height: '100%', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 20 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shareAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  shareAvatarText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  shareEmail: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
});
