/**
 * FeedbackCard component for the Inbox screen.
 * Displays a customer's negative feedback with action buttons.
 *
 * Shows: Rating badge (colored circle), Customer Name, Feedback Text (if provided),
 * date received, and action buttons (Call Customer, Mark Resolved).
 *
 * Requirements: 6.2, 6.3, 6.4
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface FeedbackCardProps {
  /** Customer name (from related ReviewRequest) */
  customerName: string;
  /** Rating value (1-3 for negative feedback) */
  rating: number;
  /** Optional written feedback text */
  feedbackText?: string;
  /** Date the feedback was received */
  createdAt: Date;
  /** Whether this feedback has been resolved */
  isResolved: boolean;
  /** Called when "Call Customer" is tapped */
  onCall: () => void;
  /** Called when "Mark Resolved" is tapped */
  onResolve: () => void;
  /** Whether the resolve action is currently loading */
  isResolving?: boolean;
}

/** Returns a color for the rating badge based on the rating value */
function getRatingColor(rating: number): string {
  if (rating === 1) return '#EF4444'; // red
  if (rating === 2) return '#F97316'; // orange
  return '#EAB308'; // yellow for 3
}

/** Formats a Date into a short readable string */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function FeedbackCard({
  customerName,
  rating,
  feedbackText,
  createdAt,
  isResolved,
  onCall,
  onResolve,
  isResolving = false,
}: FeedbackCardProps) {
  const ratingColor = getRatingColor(rating);

  return (
    <View
      className="bg-white rounded-2xl p-4 border border-light-gray mb-3"
      accessibilityRole="summary"
      accessibilityLabel={`Feedback from ${customerName}, rating ${rating} out of 5`}
    >
      {/* Header: Rating badge + Customer Name + Date */}
      <View className="flex-row items-center mb-2">
        {/* Rating Circle */}
        <View
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: ratingColor }}
          accessibilityLabel={`Rating ${rating}`}
        >
          <Text className="text-white font-bold text-body">{rating}</Text>
        </View>

        {/* Customer Name + Date */}
        <View className="flex-1">
          <Text className="text-body font-bold text-navy" numberOfLines={1}>
            {customerName}
          </Text>
          <Text className="text-caption text-navy/50 mt-0.5">
            {formatDate(createdAt)}
          </Text>
        </View>

        {/* Resolved indicator */}
        {isResolved && (
          <View className="bg-success-green/10 rounded-full px-2 py-1">
            <Text className="text-[11px] font-medium text-success-green">
              Resolved
            </Text>
          </View>
        )}
      </View>

      {/* Feedback Text (only if provided) */}
      {feedbackText ? (
        <View className="ml-12 mb-3">
          <Text className="text-body text-navy/70 leading-5" numberOfLines={4}>
            {feedbackText}
          </Text>
        </View>
      ) : null}

      {/* Action Buttons (only for unresolved) */}
      {!isResolved && (
        <View className="flex-row ml-12 mt-1 gap-2">
          <Pressable
            onPress={onCall}
            className="flex-row items-center bg-card-bg rounded-xl px-3 py-2 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Call ${customerName}`}
          >
            <Ionicons name="call-outline" size={16} color="#0B1D3A" />
            <Text className="text-caption font-medium text-navy ml-1.5">
              Call Customer
            </Text>
          </Pressable>

          <Pressable
            onPress={onResolve}
            disabled={isResolving}
            className={`flex-row items-center bg-success-green/10 rounded-xl px-3 py-2 active:opacity-70 ${
              isResolving ? 'opacity-50' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel="Mark as resolved"
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#22C55E"
            />
            <Text className="text-caption font-medium text-success-green ml-1.5">
              {isResolving ? 'Resolving...' : 'Mark Resolved'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
