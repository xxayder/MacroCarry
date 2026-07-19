import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getDeviceInfo, submitFeedback } from '@/lib/feedback';
import { validateMacros } from '@/lib/utils';

export default function SettingsScreen() {
  const { profile, updateProfile, signOut } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [carryover, setCarryover] = useState(true);
  const [displayName, setDisplayName] = useState('');

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'suggestion' | 'other'>('bug');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    if (profile) {
      setCalories(String(profile.daily_calorie_goal));
      setProtein(String(profile.protein_goal_g));
      setCarbs(String(profile.carbs_goal_g));
      setFat(String(profile.fat_goal_g));
      setFiber(String(profile.fiber_goal_g));
      setSugar(String(profile.sugar_goal_g));
      setSodium(String(profile.sodium_goal_mg));
      setCarryover(profile.carryover_enabled ?? true);
      setDisplayName(profile.display_name ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    const { warning } = validateMacros(Number(calories), Number(protein), Number(carbs), Number(fat));

    const proceed = async () => {
      setSaving(true);
      try {
        await updateProfile({
          display_name: displayName || null,
          daily_calorie_goal: Number(calories),
          protein_goal_g: Number(protein),
          carbs_goal_g: Number(carbs),
          fat_goal_g: Number(fat),
          fiber_goal_g: Number(fiber),
          sugar_goal_g: Number(sugar),
          sodium_goal_mg: Number(sodium),
          carryover_enabled: carryover,
        });
        Alert.alert('Saved', 'Your goals have been updated.');
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Could not save.');
      } finally {
        setSaving(false);
      }
    };

    if (warning) {
      Alert.alert('Macro Warning', warning, [
        { text: 'Adjust', style: 'cancel' },
        { text: 'Save Anyway', onPress: proceed },
      ]);
    } else {
      proceed();
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Empty message', 'Please describe your feedback before sending.');
      return;
    }
    setSendingFeedback(true);
    try {
      await submitFeedback({
        user_id: profile?.id ?? null,
        user_email: profile?.email ?? null,
        message: feedbackText.trim(),
        category: feedbackCategory,
        device_info: getDeviceInfo(),
      });
      setFeedbackText('');
      setFeedbackVisible(false);
      Alert.alert('Feedback sent', 'Thanks! Your feedback has been recorded.');
    } catch {
      Alert.alert('Could not send', 'Please try again later.');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleSignOut = () => {
    if (signingOut) return;
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            // Route guard in index.tsx will redirect to login once user is null.
          } catch (err: any) {
            // signOut clears local state before throwing, so the user IS signed
            // out on this device — this error only means the server revocation
            // failed (e.g. a network issue). Show it so the user is aware.
            Alert.alert('Sign Out Issue', err.message ?? 'Signed out, but the server could not be notified. You are signed out on this device.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  if (!profile) return null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      {/* Profile */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PROFILE</Text>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Display Name</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.borderMuted }]} />
        <View style={[styles.field, { paddingBottom: 12 }]}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Email</Text>
          <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>{profile.email}</Text>
        </View>
      </View>

      {/* Goals */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DAILY GOALS</Text>
        <GoalField label="Calories" value={calories} onChange={setCalories} unit="kcal" colors={colors} />
        <Div colors={colors} />
        <GoalField label="Protein" value={protein} onChange={setProtein} unit="g" colors={colors} />
        <Div colors={colors} />
        <GoalField label="Carbs" value={carbs} onChange={setCarbs} unit="g" colors={colors} />
        <Div colors={colors} />
        <GoalField label="Fat" value={fat} onChange={setFat} unit="g" colors={colors} />
        <Div colors={colors} />
        <GoalField label="Fiber" value={fiber} onChange={setFiber} unit="g" colors={colors} />
        <Div colors={colors} />
        <GoalField label="Sugar" value={sugar} onChange={setSugar} unit="g" colors={colors} />
        <Div colors={colors} />
        <GoalField label="Sodium" value={sodium} onChange={setSodium} unit="mg" colors={colors} />
      </View>

      {/* Carryover */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CARRYOVER</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchLeft}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Calorie Carryover</Text>
            <Text style={[styles.switchHint, { color: colors.textMuted }]}>
              Unused calories carry to the next day
            </Text>
          </View>
          <Switch
            value={carryover}
            onValueChange={setCarryover}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      {/* Navigation */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SHARING</Text>
        <NavRow
          label="Share my log"
          icon="share-2"
          onPress={() => router.push('/sharing')}
          colors={colors}
        />
        <Div colors={colors} />
        <NavRow
          label="Logs shared with me"
          icon="eye"
          onPress={() => router.push('/shared-with-me')}
          colors={colors}
        />
      </View>

      {/* Feedback */}
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FEEDBACK</Text>
        <NavRow
          label="Send feedback"
          icon="message-square"
          onPress={() => setFeedbackVisible(true)}
          colors={colors}
        />
      </View>

      {/* Feedback modal */}
      <Modal
        visible={feedbackVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackVisible(false)} hitSlop={8}>
                <Feather name="x" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {(['bug', 'suggestion', 'other'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: feedbackCategory === cat ? colors.primary : colors.background,
                        borderColor: feedbackCategory === cat ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setFeedbackCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: feedbackCategory === cat ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {cat === 'bug' ? '🐛 Bug' : cat === 'suggestion' ? '💡 Suggestion' : '💬 Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 16 }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.feedbackInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder={feedbackCategory === 'bug' ? "Describe what happened and how to reproduce it…" : "Share your thoughts…"}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={[styles.charCount, { color: colors.textMuted }]}>{feedbackText.length}/2000</Text>

              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sendingFeedback ? 0.7 : 1 }]}
                onPress={handleSendFeedback}
                disabled={sendingFeedback}
                activeOpacity={0.8}
              >
                {sendingFeedback ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={styles.sendBtnText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.signOutBtn, { borderColor: colors.destructive + '55', opacity: signingOut ? 0.6 : 1 }]}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.8}
      >
        {signingOut ? (
          <ActivityIndicator size="small" color={colors.destructive} />
        ) : (
          <>
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function GoalField({ label, value, onChange, unit, colors }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border }]}>
        <TextInput
          style={[styles.inputSmall, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.unit, { color: colors.textMuted }]}>{unit}</Text>
      </View>
    </View>
  );
}

function NavRow({ label, icon, onPress, colors }: any) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.7}>
      <Feather name={icon} size={16} color={colors.primary} />
      <Text style={[styles.navLabel, { color: colors.text }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function Div({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.borderMuted, marginHorizontal: 16 }]} />;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  section: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  fieldLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  fieldValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  input: { flex: 1, marginLeft: 16, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'right', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderRadius: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, height: 34, width: 108 },
  inputSmall: { flex: 1, textAlign: 'right', textAlignVertical: 'center', paddingVertical: 0, fontSize: 14, fontFamily: 'Inter_500Medium' },
  unit: { fontSize: 12, fontFamily: 'Inter_400Regular', marginLeft: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  switchLeft: { flex: 1, gap: 2 },
  switchHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  navLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  saveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  signOutBtn: { height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  signOutText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  modalLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  categoryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  feedbackInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 120, marginTop: 6 },
  charCount: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  sendBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  sendBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
});
