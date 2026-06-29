/**
 * Manual URL paste field with live validation for Google Review URLs.
 * Shows success/error feedback as the user types.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput } from 'react-native';

import { validateGoogleReviewUrl } from '../utils/googleReviewUrl';

export interface ManualUrlInputProps {
  /** Called when a valid Google Review URL is entered */
  onValidUrl: (url: string) => void;
}

/**
 * A text input for pasting a Google Review link directly.
 * Performs live validation and provides visual feedback.
 */
export function ManualUrlInput({ onValidUrl }: ManualUrlInputProps) {
  const [url, setUrl] = useState('');

  const isValid = url.length > 0 && validateGoogleReviewUrl(url);
  const isInvalid = url.length > 0 && !validateGoogleReviewUrl(url);

  const handleChangeText = useCallback(
    (text: string) => {
      setUrl(text);
      if (validateGoogleReviewUrl(text)) {
        onValidUrl(text);
      }
    },
    [onValidUrl],
  );

  return (
    <View className="w-full">
      <Text className="text-caption font-medium text-navy mb-1">
        Paste Google Review Link
      </Text>
      <TextInput
        className={`border ${isInvalid ? 'border-red-500' : isValid ? 'border-green-500' : 'border-light-gray'} rounded-xl px-4 py-3 text-body text-navy bg-white`}
        placeholder="https://..."
        placeholderTextColor="#9CA3AF"
        value={url}
        onChangeText={handleChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel="Paste Google Review Link"
        accessibilityHint="Enter your Google Review URL for validation"
      />
      {isValid && (
        <Text className="text-caption text-green-600 mt-1" accessibilityLiveRegion="polite">
          ✓ Valid Google Review URL
        </Text>
      )}
      {isInvalid && (
        <Text className="text-caption text-red-500 mt-1" accessibilityLiveRegion="polite">
          Please enter a valid Google Business review link.
        </Text>
      )}
    </View>
  );
}
