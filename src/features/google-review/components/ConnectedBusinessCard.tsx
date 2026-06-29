/**
 * Displays the currently connected Google Business with a success indicator
 * and an option to change the selection.
 *
 * Requirements: 5.2
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface ConnectedBusinessCardProps {
  /** The connected business name */
  businessName: string;
  /** The Google Review URL for the connected business */
  googleReviewUrl: string;
  /** Called when the user wants to change the connected business */
  onChangePress: () => void;
}

/**
 * A card showing the currently connected business with a green checkmark
 * and a "Change" action button.
 */
export function ConnectedBusinessCard({
  businessName,
  googleReviewUrl,
  onChangePress,
}: ConnectedBusinessCardProps) {
  return (
    <View className="bg-white rounded-2xl border border-light-gray p-4">
      <View className="flex-row items-center">
        {/* Green checkmark circle */}
        <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center mr-3">
          <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
        </View>

        {/* Business info */}
        <View className="flex-1">
          <Text className="text-body font-semibold text-navy" numberOfLines={1}>
            {businessName}
          </Text>
          <Text className="text-caption text-navy/60 mt-0.5" numberOfLines={1}>
            {googleReviewUrl}
          </Text>
        </View>

        {/* Change button */}
        <Pressable
          onPress={onChangePress}
          accessibilityRole="button"
          accessibilityLabel="Change connected business"
          className="ml-3"
        >
          <Text className="text-caption font-semibold text-navy">
            Change
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
