import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { lookupBarcode } from '@/lib/openFoodFacts';
import type { ParsedOFFProduct } from '@/types';

export default function ScannerScreen() {
  const { meal_type, date } = useLocalSearchParams<{ meal_type: string; date: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const lastBarcode = useRef('');

  const handleBarcode = async ({ data }: { data: string; type: string }) => {
    if (scanned || loading || data === lastBarcode.current) return;
    lastBarcode.current = data;
    setScanned(true);
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const product = await lookupBarcode(data);
      goToServing(product, data);
    } catch {
      Alert.alert(
        'Product not found',
        `No nutrition data found for barcode ${data}. Would you like to enter it manually?`,
        [
          { text: 'Try again', onPress: () => { setScanned(false); setLoading(false); lastBarcode.current = ''; } },
          {
            text: 'Manual entry',
            onPress: () =>
              router.replace({ pathname: '/manual-food', params: { meal_type, date, barcode: data } }),
          },
        ]
      );
      setLoading(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualBarcode.trim()) return;
    setLoading(true);
    try {
      const product = await lookupBarcode(manualBarcode.trim());
      goToServing(product, manualBarcode.trim());
    } catch {
      Alert.alert(
        'Not found',
        'No product found for that barcode.',
        [
          { text: 'OK' },
          {
            text: 'Manual entry',
            onPress: () =>
              router.replace({ pathname: '/manual-food', params: { meal_type, date, barcode: manualBarcode.trim() } }),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const goToServing = (product: ParsedOFFProduct, barcode: string) => {
    router.replace({
      pathname: '/serving-picker',
      params: {
        meal_type,
        date,
        barcode,
        food_name: product.food_name,
        brand: product.brand ?? '',
        serving_size: product.serving_size,
        serving_unit: product.serving_unit,
        cal: product.per100g.calories,
        protein: product.per100g.protein_g,
        carbs: product.per100g.carbs_g,
        fat: product.per100g.fat_g,
        fiber: product.per100g.fiber_g,
        sugar: product.per100g.sugar_g,
        sodium: product.per100g.sodium_mg,
        source: 'open_food_facts',
      },
    });
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="camera-off" size={48} color={colors.textMuted} />
        <Text style={[styles.permTitle, { color: colors.text }]}>Camera Access Needed</Text>
        <Text style={[styles.permBody, { color: colors.textSecondary }]}>
          MacroCarry needs camera access to scan barcodes.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.btnText}>Allow Camera</Text>
          </TouchableOpacity>
        ) : (
          Platform.OS !== 'web' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => { try { Linking.openSettings(); } catch {} }}>
              <Text style={styles.btnText}>Open Settings</Text>
            </TouchableOpacity>
          )
        )}
        <TouchableOpacity onPress={() => setShowManual(true)} style={styles.altBtn}>
          <Text style={[styles.altBtnText, { color: colors.primary }]}>Enter barcode manually</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.altBtn}>
          <Text style={[styles.altBtnText, { color: colors.textMuted }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {Platform.OS !== 'web' && !showManual && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcode}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
        />
      )}

      {/* Overlay */}
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.scanTitle}>Scan Barcode</Text>
      </View>

      {/* Viewfinder */}
      {!showManual && (
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {loading && <ActivityIndicator color={colors.primary} size="large" />}
        </View>
      )}

      {/* Bottom actions */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {showManual ? (
          <View style={[styles.manualBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.manualLabel, { color: colors.text }]}>Enter barcode number</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={[styles.manualInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                keyboardType="numeric"
                placeholder="e.g. 5449000000996"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.lookupBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleManualLookup}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="search" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowManual(false)}>
              <Text style={[styles.altBtnText, { color: colors.primary, textAlign: 'center', marginTop: 8 }]}>
                Use camera instead
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.scanHint}>Point camera at any food barcode</Text>
            <TouchableOpacity onPress={() => setShowManual(true)} style={styles.manualToggle}>
              <Text style={[styles.altBtnText, { color: '#fff' }]}>Enter barcode manually</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_W = 3;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  permTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  permBody: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  btn: { height: 48, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  altBtn: { paddingVertical: 8 },
  altBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  closeBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanTitle: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold', textShadowColor: '#000', textShadowRadius: 4 },
  viewfinder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 240,
    height: 180,
    marginLeft: -120,
    marginTop: -130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#22C55E',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 4 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  scanHint: { color: '#fff', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 12, textShadowColor: '#000', textShadowRadius: 4 },
  manualToggle: { alignItems: 'center', paddingVertical: 8 },
  manualBox: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  manualLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  manualRow: { flexDirection: 'row', gap: 10 },
  manualInput: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  lookupBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
