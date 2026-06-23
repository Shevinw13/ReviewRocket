import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface ErrorIndicatorProps {
  /** Error message to display */
  message: string;
  /** Called when the user dismisses the error */
  onDismiss?: () => void;
  /** Called when the user taps retry */
  onRetry?: () => void;
}

/**
 * Error indicator that remains visible until the user dismisses or retries.
 * Displays a red-accented box per requirement 12.3.
 */
export function ErrorIndicator({ message, onDismiss, onRetry }: ErrorIndicatorProps) {
  return (
    <View
      className="rounded-2xl bg-red-50 border border-red-200 p-4"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View className="flex-row items-start">
        <View className="w-6 h-6 items-center justify-center rounded-full bg-red-500 mr-3 mt-0.5">
          <Text className="text-white text-[14px] font-bold">!</Text>
        </View>
        <Text className="text-body text-red-700 flex-1">{message}</Text>
      </View>

      <View className="flex-row justify-end mt-3 gap-3">
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            className="px-4 py-2"
          >
            <Text className="text-caption font-semibold text-red-600">Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            className="px-4 py-2"
          >
            <Text className="text-caption font-semibold text-red-600">Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
