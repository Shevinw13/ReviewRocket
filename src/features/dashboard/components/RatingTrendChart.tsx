/**
 * Rating trend mini bar chart.
 * Shows one bar per individual rating (most recent 12).
 * Tap a bar to see customer name, rating, and time.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeContext';
import type { ComparisonPeriod } from './DashboardMetrics';

export interface RatingDataPoint {
  date: Date;
  averageRating: number;
  count: number;
  customerName?: string;
}

export interface RatingTrendChartProps {
  data: RatingDataPoint[];
  period: ComparisonPeriod;
  overallAverage: number | null;
}

function getBarColor(rating: number): string {
  if (rating >= 4) return '#22C55E';
  if (rating >= 3) return '#F59E0B';
  return '#EF4444';
}

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
  let stars = '';
  for (let i = 0; i < rating; i++) stars += '★';
  for (let i = rating; i < 5; i++) stars += '☆';
  return stars;
}

const MAX_BARS = 12;

export function RatingTrendChart({ data, period, overallAverage }: RatingTrendChartProps) {
  const { colors: t } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const periodLabel = period === 'day' ? 'today' : period === 'week' ? 'this week' : 'this month';
  const totalRatings = data.reduce((sum, d) => sum + d.count, 0);

  if (totalRatings === 0 || overallAverage === null) {
    return (
      <View className="rounded-2xl p-4 mt-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text className="text-caption font-semibold ml-2" style={{ color: t.text }}>
              Avg Rating
            </Text>
          </View>
          <Text className="text-caption" style={{ color: t.textMuted }}>
            No ratings {periodLabel}
          </Text>
        </View>
      </View>
    );
  }

  const bars = data.slice(-MAX_BARS);
  const barHeight = 36;

  // More pronounced height mapping:
  // rating 1 = 15%, 2 = 30%, 3 = 50%, 4 = 75%, 5 = 100%
  function getHeightPercent(rating: number): number {
    switch (rating) {
      case 1: return 15;
      case 2: return 30;
      case 3: return 50;
      case 4: return 75;
      case 5: return 100;
      default: return 50;
    }
  }

  const selectedBar = selectedIndex !== null ? bars[selectedIndex] : null;

  return (
    <View className="rounded-2xl p-4 mt-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text className="text-caption font-semibold ml-2" style={{ color: t.text }}>
            Avg Rating
          </Text>
          <Text className="text-caption ml-2" style={{ color: t.textMuted }}>
            · {totalRatings} rating{totalRatings !== 1 ? 's' : ''} {periodLabel}
          </Text>
        </View>
        <Text className="text-xl font-bold" style={{ color: getBarColor(overallAverage) }}>
          {overallAverage.toFixed(1)}
        </Text>
      </View>

      {/* Tooltip */}
      {selectedBar && (
        <Pressable
          onPress={() => setSelectedIndex(null)}
          className="bg-navy rounded-lg px-3 py-2 mb-2 flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Dismiss tooltip"
        >
          <Text className="text-caption text-white font-medium flex-1" numberOfLines={1}>
            {selectedBar.customerName || 'Customer'} — {renderStars(selectedBar.averageRating)}
          </Text>
          <Text className="text-caption text-white/60 ml-2">
            {getTimeAgo(selectedBar.date)}
          </Text>
          <Ionicons name="close" size={14} color="rgba(255,255,255,0.5)" style={{ marginLeft: 8 }} />
        </Pressable>
      )}

      {/* Bar chart */}
      <View className="flex-row items-end" style={{ height: barHeight, gap: 4 }}>
        {bars.map((point, index) => {
          const heightPercent = getHeightPercent(Math.round(point.averageRating));
          const isSelected = selectedIndex === index;
          return (
            <Pressable
              key={index}
              onPress={() => setSelectedIndex(isSelected ? null : index)}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                backgroundColor: getBarColor(point.averageRating),
                borderRadius: 3,
                opacity: selectedIndex !== null && !isSelected ? 0.4 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Rating ${point.averageRating} from ${point.customerName || 'customer'}`}
            />
          );
        })}
      </View>

      {/* Footer */}
      {bars.length < totalRatings && (
        <Text className="text-[10px] mt-1.5" style={{ color: t.textMuted }}>
          Showing latest {bars.length}
        </Text>
      )}
    </View>
  );
}
