import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useService } from '@/services';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import type { NotificationPermissionStatus } from '@/types';

const PROMPT_DISMISSED_KEY = '@review_rocket/notification_prompt_dismissed';

/**
 * Hook that manages notification setup on first authenticated app launch.
 *
 * Behavior:
 * - Checks notification permission status on first authenticated mount
 * - If permission is not granted, exposes state to show the permission prompt
 * - Registers the device push token after permission is granted
 * - Persists prompt dismissal so the user isn't nagged repeatedly within a session
 *
 * Requirements: 7.6
 */
export function useNotificationSetup() {
  const notificationService = useService('notifications');
  const { session } = useAuthContext();

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');
  const [showPrompt, setShowPrompt] = useState(false);
  const hasChecked = useRef(false);

  // Check permission on first authenticated mount
  useEffect(() => {
    if (!session || hasChecked.current) return;
    hasChecked.current = true;

    async function checkPermission() {
      // Check if user previously dismissed the prompt this install
      const dismissed = await AsyncStorage.getItem(PROMPT_DISMISSED_KEY);
      if (dismissed === 'true') {
        // Still check status in case they granted permission via device settings
        const status = await notificationService.getPermissionStatus();
        setPermissionStatus(status);
        if (status === 'granted') {
          await registerToken();
        }
        return;
      }

      const status = await notificationService.getPermissionStatus();
      setPermissionStatus(status);

      if (status === 'granted') {
        await registerToken();
      } else {
        setShowPrompt(true);
      }
    }

    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function registerToken() {
    try {
      // expo-notifications getExpoPushTokenAsync returns the token
      const { getExpoPushTokenAsync } = await import('expo-notifications');
      const tokenData = await getExpoPushTokenAsync();
      if (session?.user.id) {
        await notificationService.registerDevice(tokenData.data, session.user.id);
      }
    } catch {
      // Token registration is best-effort; don't block the user
    }
  }

  const handleDismiss = useCallback(async () => {
    setShowPrompt(false);
    await AsyncStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  }, []);

  const handlePermissionGranted = useCallback(async () => {
    setPermissionStatus('granted');
    setShowPrompt(false);
    await registerToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return {
    /** Whether the permission prompt should be displayed */
    showPrompt,
    /** Current notification permission status */
    permissionStatus,
    /** Dismiss the prompt (persists to AsyncStorage) */
    handleDismiss,
    /** Called when permission is granted via the prompt */
    handlePermissionGranted,
  };
}
