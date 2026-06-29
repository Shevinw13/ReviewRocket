/**
 * A single search result row displaying a business name, address, and optional rating.
 * Used within the Places search results list.
 *
 * Requirements: 1.4
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface PlacesSearchResultItemProps {
  /** Business display name */
  name: string;
  /** Human-readable address */
  formattedAddress: string;
  /** Google rating (1.0–5.0), undefined if unavailable */
  rating?: number;
  /** Called when the user selects this result */
  onSelect: () => void;
}

/**
 * Renders a single place result as a pressable row.
 * Shows business name (bold), address (caption), and optional star rating.
 */
export function PlacesSearchResultItem({
  name,
  formattedAddress,
  rating,
  onSelect,
}: PlacesSearchResultItemProps) {
  return (
    <Pressable
      className="flex-row items-center px-4 py-3 border-b border-light-gray active:bg-card-bg"
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`Select ${name}, ${formattedAddress}${rating ? `, rated ${rating} stars` : ''}`}
    >
      <View className="flex-1">
        <Text className="text-body font-semibold text-navy" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-caption text-navy/60 mt-0.5" numberOfLines={1}>
          {formattedAddress}
        </Text>
      </View>

      {rating != null && (
        <View className="flex-row items-center ml-3">
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text className="text-caption font-medium text-navy ml-1">
            {rating.toFixed(1)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
