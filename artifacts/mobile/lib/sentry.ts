import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isSentryConfigured = !!dsn;

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version ?? '1.0.0',
    debug: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!isSentryConfigured) return;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function setSentryUser(id: string, email: string) {
  if (!isSentryConfigured) return;
  Sentry.setUser({ id, email });
}

export function clearSentryUser() {
  if (!isSentryConfigured) return;
  Sentry.setUser(null);
}

export function wrapWithSentry<T extends React.ComponentType<any>>(component: T): T {
  if (!isSentryConfigured) return component;
  return Sentry.wrap(component) as T;
}
