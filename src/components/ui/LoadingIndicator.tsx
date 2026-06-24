import React from 'react';
import { ActivityIndicator, View, type ActivityIndicatorProps } from 'react-native';

export interface LoadingIndicatorProps {
  /** Spinner size */
  size?: ActivityIndicatorProps['size'];
  /** Spinner color (defaults to Teal) */
  color?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * Loading indicator wrapper around ActivityIndicator.
 * Designed to appear within 200ms of action start per requirement 12.3.
 * Render this component immediately when an async action begins —
 * React Native's ActivityIndicator animates on mount with no built-in delay.
 */
export function LoadingIndicator({
  size = 'small',
  color = '#0CBFA6',
  accessibilityLabel = 'Loading',
}: LoadingIndicatorProps) {
  return (
    <View className="items-center justify-center p-2" accessibilityRole="progressbar">
      <ActivityIndicator
        size={size}
        color={color}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}
