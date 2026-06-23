import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';

export interface SuccessIndicatorProps {
  /** Whether to show the success indicator */
  visible: boolean;
  /** Message to display (defaults to "Success") */
  message?: string;
  /** Called when the indicator finishes its display duration */
  onDone?: () => void;
  /** Display duration in ms (defaults to 2000) */
  duration?: number;
}

/**
 * Success indicator with a green checkmark that fades out after 2 seconds.
 * Uses Success Green per requirement 12.3.
 */
export function SuccessIndicator({
  visible,
  message = 'Success',
  onDone,
  duration = 2000,
}: SuccessIndicatorProps) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacity.setValue(1);

      const fadeTimeout = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShouldRender(false);
          onDone?.();
        });
      }, duration);

      return () => clearTimeout(fadeTimeout);
    } else {
      setShouldRender(false);
    }
  }, [visible, duration, onDone, opacity]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={{ opacity }}
      className="flex-row items-center rounded-2xl bg-success-green/10 p-4"
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View className="w-6 h-6 items-center justify-center rounded-full bg-success-green mr-3">
        <Text className="text-white text-[14px] font-bold">✓</Text>
      </View>
      <Text className="text-body font-medium text-success-green">{message}</Text>
    </Animated.View>
  );
}
