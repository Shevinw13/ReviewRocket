/**
 * FeedbackReceivedCard component for the Inbox screen.
 * Displays a notification when a customer replies with written feedback
 * for a bad review (rating 1-3).
 *
 * Shows: Warning icon, "New Customer Feedback" title, body text,
 * and a "Dismiss" button.
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface FeedbackReceivedCardProps {
  /** Card title (e.g., "New Customer Feedback") */
  title: string;
  /** Body text describing the feedback received */
  body: string;
  /** Called when "Dismiss" button is tapped */
  onDismiss: () => void;
  /** Whether the dismiss action is currently loading */
  isDismissing?: boolean;
}

export function FeedbackReceivedCard({
  title,
  body,
  onDismiss,
  isDismissing = false,
}: FeedbackReceivedCardProps) {
  return (
    <View
      className="bg-white rounded-2xl p-4 border border-light-gray mb-3"
      accessibilityRole="summary"
      accessibilityLabel={`${title}: ${body}`}
    >
      {/* Header: Icon + Title */}
      <View className="flex-row items-center mb-2">
        {/* Orange/amber warning icon in a subtle circle */}
        <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-[#F97316]/10">
          <Ionicons name="chatbubble-ellipses" size={20} color="#F97316" />
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
