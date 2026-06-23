import React, { useState } from 'react';
import { View, Text, Linking } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useService } from '@/services';
import type { NotificationPermissionStatus } from '@/types';

export interface NotificationPermissionPromptProps {
  /** Current permission status — prompt only renders when 'undetermined' or 'denied' */
  permissionStatus: NotificationPermissionStatus;
  /** Called when the user dismisses the prompt or permission is granted */
  onDismiss: () => void;
  /** Called after permission is successfully granted */
  onPermissionGranted?: () => void;
}

/**
 * In-app prompt explaining the value of push notifications.
 * Shows when notification permission is not granted.
 * Provides actions to request permission, open device settings, or dismiss.
 *
 * Requirements: 7.6
 */
export function NotificationPermissionPrompt({
  permissionStatus,
  onDismiss,
  onPermissionGranted,
}: NotificationPermissionPromptProps) {
  const notificationService = useService('notifications');
  const [isRequesting, setIsRequesting] = useState(false);

  // Only render if permission is not granted
  if (permissionStatus === 'granted') {
    return null;
  }

  async function handleEnableNotifications() {
    setIsRequesting(true);
    try {
      const status = await notificationService.requestPermission();
      if (status === 'granted') {
        onPermissionGranted?.();
      }
      onDismiss();
    } finally {
      setIsRequesting(false);
    }
  }

  function handleOpenSettings() {
    Linking.openSettings();
    onDismiss();
  }

  return (
    <Card
      className="mx-4 my-4"
      accessibilityRole="alert"
      accessibilityLabel="Notification permission request"
    >
      <View className="items-center px-2 py-2">
        {/* Icon */}
        <Text className="mb-3 text-4xl">🔔</Text>

        {/* Heading */}
        <Text className="mb-2 text-center text-heading font-bold text-navy">
          Stay in the Loop
        </Text>

        {/* Value explanation */}
        <Text className="mb-6 text-center text-body text-navy/70">
          Get instant alerts when customers leave feedback so you can respond
          quickly.
        </Text>

        {/* Actions */}
        <View className="w-full gap-3">
          {permissionStatus === 'undetermined' && (
            <Button
              title="Enable Notifications"
              onPress={handleEnableNotifications}
              loading={isRequesting}
              accessibilityLabel="Enable push notifications"
            />
          )}

          {permissionStatus === 'denied' && (
            <Button
              title="Open Settings"
              onPress={handleOpenSettings}
              accessibilityLabel="Open device notification settings"
            />
          )}

          <Button
            title="Maybe Later"
            onPress={onDismiss}
            variant="secondary"
            accessibilityLabel="Dismiss notification prompt"
          />
        </View>
      </View>
    </Card>
  );
}
