import * as Updates from 'expo-updates';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

export function UpdateBanner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  const checkAndFetch = useCallback(async () => {
    if (!Updates.isEnabled) return;
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) return;
      await Updates.fetchUpdateAsync();
      setUpdateReady(true);
    } catch {
      // silently ignore — network errors, dev mode, etc.
    }
  }, []);

  useEffect(() => {
    checkAndFetch();
  }, [checkAndFetch]);

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setReloading(false);
    }
  }, []);

  if (!updateReady) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top > 0 ? insets.top : 12,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.inner}
        onPress={handleReload}
        activeOpacity={0.8}
        disabled={reloading}
      >
        {reloading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Text style={styles.icon}>⬆</Text>
            <Text style={styles.text}>Update available — tap to reload</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  icon: {
    fontSize: 14,
    color: '#fff',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.1,
  },
});
