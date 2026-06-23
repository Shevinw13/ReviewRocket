import React from 'react';
import { View, Text } from 'react-native';

export interface BadgeProps {
  /** Numeric count to display */
  count: number;
  /** Accessibility label (defaults to "[count] items") */
  accessibilityLabel?: string;
}

/**
 * Small circular numeric badge using Rocket Orange background.
 * Used for unread counts on tabs and inbox filters.
 * Renders nothing if count is 0 or negative.
 */
export function Badge({ count, accessibilityLabel }: BadgeProps) {
  if (count <= 0) return null;

  const displayText = count > 99 ? '99+' : String(count);

  return (
    <View
      className="min-w-[20px] h-5 items-center justify-center rounded-full bg-rocket-orange px-1"
      accessibilityLabel={accessibilityLabel ?? `${count} items`}
      accessibilityRole="text"
    >
      <Text className="text-white text-[11px] font-bold leading-tight">
        {displayText}
      </Text>
    </View>
  );
}
