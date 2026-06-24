import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'disabled'> {
  /** Button label text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary';
  /** Show a loading spinner and disable interaction */
  loading?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Accessibility label override (defaults to title) */
  accessibilityLabel?: string;
}

/**
 * Reusable button with primary (Teal) and secondary variants.
 * Supports loading and disabled states with appropriate visual feedback.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const baseClasses = 'flex-row items-center justify-center rounded-2xl px-6 py-3';
  const primaryClasses = 'bg-teal';
  const secondaryClasses = 'border border-light-gray bg-white';
  const disabledClasses = 'opacity-50';

  const variantClasses = variant === 'primary' ? primaryClasses : secondaryClasses;
  const containerClasses = `${baseClasses} ${variantClasses} ${isDisabled ? disabledClasses : ''}`;

  const textBaseClasses = 'text-body font-semibold';
  const textColorClasses = variant === 'primary' ? 'text-white' : 'text-navy';
  const textClasses = `${textBaseClasses} ${textColorClasses}`;

  return (
    <TouchableOpacity
      className={containerClasses}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.7}
      {...rest}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#0B1D3A'}
          className="mr-2"
        />
      )}
      <Text className={textClasses}>{title}</Text>
    </TouchableOpacity>
  );
}
