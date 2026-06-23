/**
 * Push notification adapter using expo-notifications.
 * Implements INotificationService for device registration, permission handling,
 * and notification reception/tap routing.
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import type { INotificationService } from '@/services/interfaces/notification.service';
import type {
  Result,
  NotificationPermissionStatus,
  AppNotification,
  Unsubscribe,
} from '@/types';
import { ErrorCode } from '@/types';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Maps expo-notifications permission status to our app's NotificationPermissionStatus type.
 */
function mapPermissionStatus(
  status: Notifications.NotificationPermissionsStatus
): NotificationPermissionStatus {
  if (status.granted) {
    return 'granted';
  }
  if (status.status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
}

/**
 * Converts an expo Notification object into the app's AppNotification type.
 */
function toAppNotification(
  notification: Notifications.Notification
): AppNotification {
  const { request } = notification;
  const { content } = request;
  const data = content.data as
    | {
        type?: 'negative_rating' | 'written_feedback' | 'quota_warning' | 'sms_failed';
        feedbackId?: string;
        reviewRequestId?: string;
      }
    | undefined;

  return {
    id: request.identifier,
    title: content.title ?? '',
    body: content.body ?? '',
    data: data?.type
      ? {
          type: data.type,
          feedbackId: data.feedbackId,
          reviewRequestId: data.reviewRequestId,
        }
      : undefined,
    receivedAt: new Date(notification.date),
  };
}

/**
 * Handles navigation when a notification is tapped.
 * If the notification contains feedback-related data, navigates to the inbox.
 * Authentication state is handled by the app's route guards — if the user
 * is not authenticated, the protected route hook redirects to login first,
 * and after login the deep link intent is preserved by expo-router.
 */
function handleNotificationTap(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as
    | {
        type?: string;
        feedbackId?: string;
        reviewRequestId?: string;
      }
    | undefined;

  if (!data?.type) return;

  // For feedback-related notifications, navigate to inbox
  if (
    data.type === 'negative_rating' ||
    data.type === 'written_feedback' ||
    data.type === 'sms_failed'
  ) {
    router.push('/(tabs)/inbox');
  }
}

/**
 * Concrete implementation of INotificationService using expo-notifications.
 */
export class ExpoNotificationAdapter implements INotificationService {
  /**
   * Registers the device by obtaining an Expo push token and saving it
   * to the device_tokens table in Supabase.
   */
  async registerDevice(token: string, userId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase.from('device_tokens').upsert(
        {
          business_id: userId,
          token,
          platform: Platform.OS,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
            message: error.message,
            details: error,
          },
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: 'Failed to register device for push notifications',
          details: err,
        },
      };
    }
  }

  /**
   * Requests push notification permissions from the user.
   * On iOS, requests alert, badge, and sound permissions.
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    const status = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return mapPermissionStatus(status);
  }

  /**
   * Returns the current push notification permission status without prompting the user.
   */
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const status = await Notifications.getPermissionsAsync();
    return mapPermissionStatus(status);
  }

  /**
   * Registers callbacks for notification received (foreground) and notification
   * response (tap). Returns an unsubscribe function that cleans up both listeners.
   */
  onNotificationReceived(
    callback: (notification: AppNotification) => void
  ): Unsubscribe {
    // Listen for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        callback(toAppNotification(notification));
      }
    );

    // Listen for notification taps (user interaction)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Convert and pass to callback
        callback(toAppNotification(response.notification));
        // Handle navigation on tap
        handleNotificationTap(response);
      });

    // Return unsubscribe function that removes both listeners
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Utility: Gets the Expo push token for this device.
   * Call this during device registration flow.
   */
  async getExpoPushToken(): Promise<Result<string>> {
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message:
              'Missing projectId. Ensure EAS is configured or projectId is set in app config.',
          },
        };
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return { success: true, data: tokenData.data };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: 'Failed to get Expo push token',
          details: err,
        },
      };
    }
  }
}
