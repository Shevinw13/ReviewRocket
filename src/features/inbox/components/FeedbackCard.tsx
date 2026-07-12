/**
 * FeedbackCard component for the Inbox screen.
 * Displays a customer's feedback with action buttons.
 * Fully theme-aware for light/dark mode.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeContext';

export interface FeedbackCardProps {
  customerName: string;
  rating: number;
  feedbackText?: string;
  jobNote?: string;
  createdAt: Date;
  isResolved: boolean;
  isNew?: boolean;
  onCall: () => void;
  onText?: () => void;
  onResolve: () => void;
  isResolving?: boolean;
}

function getRatingColor(rating: number): string {
  if (rating === 1) return '#EF4444';
  if (rating === 2) return '#F97316';
  if (rating === 3) return '#EAB308';
  if (rating === 4) return '#22C55E';
  return '#16A34A';
}

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={14}
        color={rating >= 4 ? '#22C55E' : rating === 3 ? '#EAB308' : '#F97316'}
      />,
    );
  }
  return stars;
}

export function FeedbackCard({
  customerName,
  rating,
  feedbackText,
  jobNote,
  createdAt,
  isResolved,
  isNew = false,
  onCall,
  onText,
  onResolve,
  isResolving = false,
}: FeedbackCardProps) {
  const { colors: t, isDark } = useTheme();
  const ratingColor = getRatingColor(rating);
  const actionBg = isDark ? '#2A3A4E' : '#F2F4F7';

  return (
    <View
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: t.cardBg,
        borderWidth: 1,
        borderColor: isNew ? '#0CBFA6' : t.border,
      }}
      accessibilityRole="summary"
      accessibilityLabel={`Feedback from ${customerName}, rating ${rating} out of 5`}
    >
      {/* Header */}
      <View className="flex-row items-center mb-2">
        <View className="mr-3">
          <View className="flex-row items-center">
            {renderStars(rating)}
          </View>
        </View>

        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-body font-bold" style={{ color: t.text }} numberOfLines={1}>
              {customerName}
            </Text>
            {isNew && (
              <View className="ml-2 bg-teal/10 rounded-full px-2 py-0.5">
                <Text className="text-[10px] font-bold text-teal">NEW</Text>
              </View>
            )}
          </View>
          <Text className="text-caption mt-0.5" style={{ color: t.textMuted }} numberOfLines={1}>
            {jobNote ? `${jobNote} • ${formatDate(createdAt)}` : formatDate(createdAt)}
          </Text>
        </View>

        {isResolved && (
          <View className="bg-success-green/10 rounded-full px-2 py-1">
            <Text className="text-[11px] font-medium text-success-green">Resolved</Text>
          </View>
        )}
      </View>

      {/* Feedback Text */}
      {feedbackText ? (
        <View className="mb-3">
          <Text className="text-body leading-5" style={{ color: t.textSecondary }} numberOfLines={4}>
            {feedbackText}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      {!isResolved && (
        <View className="flex-row mt-1 gap-2 flex-wrap">
          <Pressable
            onPress={onCall}
            className="flex-row items-center rounded-xl px-3 py-2 active:opacity-70"
            style={{ backgroundColor: actionBg }}
            accessibilityRole="button"
            accessibilityLabel={`Call ${customerName}`}
          >
            <Ionicons name="call-outline" size={16} color={t.text} />
            <Text className="text-caption font-medium ml-1.5" style={{ color: t.text }}>Call</Text>
          </Pressable>

          {onText && (
            <Pressable
              onPress={onText}
              className="flex-row items-center rounded-xl px-3 py-2 active:opacity-70"
              style={{ backgroundColor: actionBg }}
              accessibilityRole="button"
              accessibilityLabel={`Text ${customerName}`}
            >
              <Ionicons name="chatbubble-outline" size={16} color={t.text} />
              <Text className="text-caption font-medium ml-1.5" style={{ color: t.text }}>Text</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onResolve}
            disabled={isResolving}
            className={`flex-row items-center bg-success-green/10 rounded-xl px-3 py-2 active:opacity-70 ${isResolving ? 'opacity-50' : ''}`}
            accessibilityRole="button"
            accessibilityLabel="Mark as resolved"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#22C55E" />
            <Text className="text-caption font-medium text-success-green ml-1.5">
              {isResolving ? 'Resolving...' : 'Resolve'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
