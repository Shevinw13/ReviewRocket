/**
 * OptOutCard component for the Inbox screen.
 * Displays an informational notification when a customer has opted out of SMS.
 *
 * Shows: Teal information icon, "Customer Opted Out" title, body text with
 * customer name/phone, and a single "Dismiss" button.
 *
 * Requirements: 2.2, 2.3, 2.5
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface OptOutCardProps {
  /** Card title (e.g., "Customer Opted Out") */
  title: string;
  /** Body text containing customer name and opt-out message */
  body: string;
  /** Called when "Dismiss" button is tapped */
  onDismiss: () => void;
  /** Whether the dismiss action is currently loading */
  isDismissing?: boolean;
}

export function OptOutCard({
  title,
  body,
  onDismiss,
  isDismissing = false,
}: OptOutCardProps) {
  return (
    <View
      className="bg-white rounded-2xl p-4 border border-light-gray mb-3"
      accessibilityRole="summary"
      accessibilityLabel={`${title}: ${body}`}
    >
      {/* Header: Icon + Title */}
      <View className="flex-row items-center mb-2">
        {/* Teal info icon in a subtle circle */}
        <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-[#0CBFA6]/10">
          <Ionicons name="information-circle" size={22} color="#0CBFA6" />
        </View>

        {/* Title */}
        <View className="flex-1">
          <Text className="text-body font-bold text-navy" numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {/* Body Text */}
      <View className="ml-12 mb-3">
        <Text className="text-body text-navy/70 leading-5">{body}</Text>
      </View>

      {/* Dismiss Button */}
      <View className="flex-row ml-12 mt-1">
        <Pressable
          onPress={onDismiss}
          disabled={isDismissing}
          className={`flex-row items-center border border-navy/20 rounded-xl px-3 py-2 active:opacity-70 ${
            isDismissing ? 'opacity-50' : ''
          }`}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          {isDismissing ? (
            <ActivityIndicator size="small" color="#0B1D3A" />
          ) : (
            <Ionicons name="close-circle-outline" size={16} color="#0B1D3A" />
          )}
          <Text className="text-caption font-medium text-navy ml-1.5">
            {isDismissing ? 'Dismissing...' : 'Dismiss'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
