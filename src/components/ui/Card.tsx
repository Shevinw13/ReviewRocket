import React from 'react';
import { View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  /** Whether to apply shadow (default true) */
  shadow?: boolean;
  /** Card content */
  children: React.ReactNode;
}

/**
 * Reusable card component with consistent border radius and background.
 * Applies an optional shadow for elevated appearance.
 */
export function Card({ shadow = true, children, className, ...rest }: CardProps) {
  const baseClasses = 'rounded-2xl bg-card-bg p-4';
  const shadowClasses = shadow
    ? 'shadow-sm shadow-black/5'
    : '';

  return (
    <View
      className={`${baseClasses} ${shadowClasses} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
