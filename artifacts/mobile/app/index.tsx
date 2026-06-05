import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function Index() {
  const { user, loading, profile, profileLoading, isConfigured } = useAuth();
  const colors = useColors();

  if (!isConfigured) return <SetupRequired />;

  if (loading || profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  // User is logged in but profile not yet created / onboarding not done
  if (!profile || !profile.daily_calorie_goal) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/" />;
}
