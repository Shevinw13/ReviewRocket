/**
 * RecentActivityFeed — Standalone reusable component displaying
 * the most recent customer ratings with customer name, star icons,
 * and time-ago labels.
 *
 * Props:
 * - items: ActivityItem[] (caller should pre-sort newest-first and limit to 10)
 * - emptyMessage?: custom empty state text
 *
 * Requirements: 5.6, 5.8
 */

import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { ActivityItem } from '@/types';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface RecentActivityFeedProps {
  /** Activity items to display (should be pre-sorted newest-first, max 10). */
  items: ActivityItem[];
  /** Custom message shown when the items array is empty. */
  emptyMessage?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={14}
        color={rating >= 4 ? '#22C55E' : '#F97316'}
      />,
    );
  }
  return stars;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecentActivityFeed({
  items,
  emptyMessage = 'No activity yet',
}: RecentActivityFeedProps) {
  if (items.length === 0) {
    return (
      <View className="bg-white rounded-2xl p-6 border border-light-gray items-center">
        <Ionicons name="chatbubbles-outline" size={32} color="#E5E7EB" />
        <Text className="text-body text-navy/40 mt-3 text-center">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl border border-light-gray overflow-hidden">
      {items.map((item: ActivityItem, index: number) => (
        <View
          key={item.id}
          className={`flex-row items-center px-4 py-3 ${
            index < items.length - 1 ? 'border-b border-light-gray' : ''
          }`}
        >
          {/* Customer Avatar Placeholder */}
          <View className="w-9 h-9 rounded-full bg-card-bg items-center justify-center mr-3">
            <Ionicons name="person" size={18} color="#9CA3AF" />
          </View>

          {/* Customer Info */}
          <View className="flex-1">
            <Text
              className="text-body font-medium text-navy"
              numberOfLines={1}
            >
              {item.customerName || 'Customer'}
            </Text>
            <View className="flex-row items-center mt-0.5">
              {renderStars(item.rating)}
            </View>
          </View>

          {/* Time Ago */}
          <Text className="text-caption text-navy/40">
            {getTimeAgo(new Date(item.createdAt))}
          </Text>
        </View>
      ))}
    </View>
  );
}
