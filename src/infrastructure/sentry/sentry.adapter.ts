/**
 * Sentry monitoring adapter implementing IMonitoringService.
 *
 * Provides error reporting with contextual metadata, user session tracking,
 * and breadcrumb logging. Scrubs sensitive customer data (customerPhone,
 * customerName, feedbackText) from all error reports via a beforeSend callback.
 *
 * Requirements: 14.1, 14.4
 */

import * as Sentry from '@sentry/react-native';
import type { ErrorEvent } from '@sentry/core';
import Constants from 'expo-constants';

import type {
  IMonitoringService,
  ErrorContext,
  Breadcrumb,
} from '@/services/interfaces/monitoring.service';

// ─── Sensitive Field Scrubbing ───────────────────────────────────────────────

/** Fields that must never appear in error reports. */
const SENSITIVE_FIELDS = ['customerPhone', 'customerName', 'feedbackText'];

/**
 * Recursively removes sensitive fields from an object.
 * Returns a new object with sensitive keys replaced by '[Redacted]'.
 */
function scrubSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(scrubSensitiveData);
  }

  if (typeof data === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.includes(key)) {
        scrubbed[key] = '[Redacted]';
      } else {
        scrubbed[key] = scrubSensitiveData(value);
      }
    }
    return scrubbed;
  }

  return data;
}

/**
 * Sentry beforeSend callback that strips sensitive customer data from all events.
 * Scrubs extras, contexts, and breadcrumb data fields.
 */
function beforeSend(event: ErrorEvent): ErrorEvent | null {
  // Scrub extra data
  if (event.extra) {
    event.extra = scrubSensitiveData(event.extra) as Record<string, unknown>;
  }

  // Scrub contexts
  if (event.contexts) {
    event.contexts = scrubSensitiveData(event.contexts) as Record<
      string,
      Record<string, unknown>
    >;
  }

  // Scrub breadcrumb data
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.data) {
        return {
          ...breadcrumb,
          data: scrubSensitiveData(breadcrumb.data) as Record<string, unknown>,
        };
      }
      return breadcrumb;
    });
  }

  return event;
}

// ─── Sentry Initialization ───────────────────────────────────────────────────

/**
 * Initializes the Sentry SDK with DSN from environment config.
 * Call this once from the root layout before rendering the app.
 *
 * Sets global tags for app version and build number so they are included
 * in all error reports automatically.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    if (__DEV__) {
      console.warn(
        '[Sentry] EXPO_PUBLIC_SENTRY_DSN not set. Sentry will not report errors.',
      );
    }
    return;
  }

  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '1';

  Sentry.init({
    dsn,
    beforeSend,
    // Disable in development to avoid noise
    enabled: !__DEV__,
    // Include release/environment info
    release: `com.nudgli.app@${appVersion}+${buildNumber}`,
    environment: __DEV__ ? 'development' : 'production',
  });

  // Set global tags so they appear on every report
  Sentry.setTag('appVersion', appVersion);
  Sentry.setTag('buildNumber', buildNumber);
}

// ─── Sentry Monitoring Adapter ───────────────────────────────────────────────

/**
 * Concrete implementation of IMonitoringService using @sentry/react-native.
 */
export class SentryMonitoringAdapter implements IMonitoringService {
  /**
   * Captures an exception with optional contextual metadata.
   * Maps ErrorContext fields to Sentry tags and extras.
   * Sensitive fields are automatically stripped by the beforeSend hook.
   */
  captureException(error: Error, context?: ErrorContext): void {
    Sentry.withScope((scope) => {
      if (context?.screenName) {
        scope.setTag('screenName', context.screenName);
      }

      if (context?.userId) {
        scope.setTag('userId', context.userId);
      }

      if (context?.deviceModel) {
        scope.setTag('deviceModel', context.deviceModel);
      }

      if (context?.osVersion) {
        scope.setTag('osVersion', context.osVersion);
      }

      if (context?.networkStatus) {
        scope.setTag('networkStatus', context.networkStatus);
      }

      if (context?.extra) {
        scope.setExtras(context.extra);
      }

      Sentry.captureException(error);
    });
  }

  /**
   * Sets the current user for session tracking.
   * Uses the provided userId as an anonymized identifier.
   */
  setUser(userId: string): void {
    Sentry.setUser({ id: userId });
  }

  /**
   * Clears the current user from Sentry session tracking.
   * Called on logout to stop associating errors with the previous user.
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Adds a breadcrumb for navigation and action tracking.
   * Breadcrumbs provide a trail of events leading up to an error.
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level ?? 'info',
      data: breadcrumb.data,
      timestamp: breadcrumb.timestamp ?? Date.now() / 1000,
    });
  }
}
