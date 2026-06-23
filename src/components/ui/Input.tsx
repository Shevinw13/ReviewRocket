import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

export interface InputProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  /** Label displayed above the input */
  label: string;
  /** Error message displayed below the input */
  error?: string;
  /** Accessibility label (defaults to label) */
  accessibilityLabel?: string;
}

/**
 * Reusable text input with label, error display, and accessibility support.
 * Error state changes the border to red and shows error text below.
 */
export function Input({
  label,
  error,
  accessibilityLabel,
  className,
  ...rest
}: InputProps) {
  const borderClasses = error
    ? 'border-red-500'
    : 'border-light-gray';

  return (
    <View className="w-full">
      <Text className="text-caption font-medium text-navy mb-1">
        {label}
      </Text>
      <TextInput
        className={`border ${borderClasses} rounded-2xl px-4 py-3 text-body text-navy bg-white ${className ?? ''}`}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error ? `Error: ${error}` : undefined}
        aria-invalid={!!error}
        placeholderTextColor="#9CA3AF"
        {...rest}
      />
      {error && (
        <Text className="text-caption text-red-500 mt-1" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}
