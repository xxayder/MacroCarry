import { Feather } from "@expo/vector-icons";
import { reloadAppAsync } from "expo";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { captureException } from "@/lib/sentry";
import { submitCrashReport, getDeviceInfo } from "@/lib/feedback";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
  componentStack?: string;
  userId?: string | null;
  userEmail?: string | null;
};

export function ErrorFallback({ error, resetError, componentStack, userId, userEmail }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  const handleSendReport = useCallback(async () => {
    if (isSending || sent) return;
    setIsSending(true);
    try {
      captureException(error, { componentStack: componentStack ?? null });
      await submitCrashReport({
        user_id: userId ?? null,
        user_email: userEmail ?? null,
        error_message: error.message,
        error_stack: error.stack ?? null,
        component_stack: componentStack ?? null,
        device_info: getDeviceInfo(),
      });
      setSent(true);
    } catch {
      Alert.alert("Could not send report", "Please try again later.");
    } finally {
      setIsSending(false);
    }
  }, [error, componentStack, userId, userEmail, isSending, sent]);

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {__DEV__ ? (
        <Pressable
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.topButton,
            {
              top: insets.top + 16,
              backgroundColor: colors.card,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="alert-circle" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.destructive + '20' }]}>
          <Feather name="alert-triangle" size={32} color={colors.destructive} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Something went wrong
        </Text>

        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          Please reload the app to continue.
        </Text>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleRestart}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                flex: 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              Try Again
            </Text>
          </Pressable>

          {!sent ? (
            <Pressable
              onPress={handleSendReport}
              disabled={isSending}
              style={({ pressed }) => [
                styles.reportButton,
                {
                  borderColor: colors.border,
                  opacity: (pressed || isSending) ? 0.7 : 1,
                  flex: 1,
                },
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <>
                  <Feather name="send" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.reportButtonText, { color: colors.mutedForeground }]}>
                    Send Report
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={[styles.reportButton, { borderColor: colors.border, flex: 1 }]}>
              <Feather name="check" size={14} color={colors.success} />
              <Text style={[styles.reportButtonText, { color: colors.success }]}>
                Report Sent
              </Text>
            </View>
          )}
        </View>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Error Details
                </Text>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Feather name="x" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: insets.bottom + 16 },
                ]}
                showsVerticalScrollIndicator
              >
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.errorText,
                      {
                        color: colors.foreground,
                        fontFamily: monoFont,
                      },
                    ]}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    maxWidth: 600,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 40,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  topButton: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  reportButton: {
    paddingVertical: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    height: "90%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  errorContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: "100%",
  },
});
