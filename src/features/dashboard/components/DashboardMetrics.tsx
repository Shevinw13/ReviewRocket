/**
 * DashboardMetrics component.
 * Displays the primary "Review Opportunities Created" card with a toggleable
 * comparison period (week over week / month over month) and three metric boxes.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { DashboardMetrics as DashboardMetricsData } from '@/types';

export type ComparisonPeriod = 'week' | 'month';

export interface DashboardMetricsProps {
  metrics: DashboardMetricsData;
  /** Week-over-week data (optional — if not provided, WoW toggle won't show change) */
  weekOverWeekChange?: number | null;
  weekCount?: number;
}

export function DashboardMetrics({
  metrics,
  weekOverWeekChange = null,
  weekCount,
}: DashboardMetricsProps) {
  const [period, setPeriod] = useState<ComparisonPeriod>('month');

  const {
    reviewOpportunities,
    monthOverMonthChange,
    positiveResponses,
    needsAttention,
    responseRate,
  } = metrics;

  // Determine which values to show based on selected period
  const currentCount = period === 'month' ? reviewOpportunities : (weekCount ?? reviewOpportunities);
  const changeValue = period === 'month' ? monthOverMonthChange : weekOverWeekChange;
  const periodLabel = period === 'month' ? 'this month' : 'this week';
  const comparisonLabel = period === 'month' ? 'vs last month' : 'vs last week';

  // Format comparison display
  const changeDisplay =
    changeValue === null || changeValue === undefined
      ? 'N/A'
      : `${changeValue >= 0 ? '+' : ''}${changeValue}%`;

  const changeColor =
    changeValue === null || changeValue === undefined
      ? 'text-navy/50'
      : changeValue >= 0
        ? 'text-success-green'
        : 'text-red-500';

  // Toggle between periods
  const togglePeriod = () => {
    setPeriod((prev) => (prev === 'month' ? 'week' : 'month'));
  };

  return (
    <View>
      {/* Primary Card — Review Opportunities Created */}
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm shadow-black/5 border border-light-gray">
        <Text className="text-caption font-medium text-navy/60 uppercase tracking-wide mb-2">
          Review Opportunities Created
        </Text>
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[40px] font-bold text-navy leading-tight">
              {currentCount}
            </Text>
            <Text className="text-caption text-navy/50 mt-1">
              {currentCount === 1 ? `1 ${periodLabel}` : `${currentCount} ${periodLabel}`}
            </Text>
          </View>
          <Pressable
            onPress={togglePeriod}
            className="flex-row items-center bg-card-bg rounded-xl px-3 py-1.5 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${period === 'month' ? 'week over week' : 'month over month'} comparison`}
          >
            {changeValue !== null && changeValue !== undefined && (
              <Ionicons
                name={changeValue >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={changeValue >= 0 ? '#22C55E' : '#EF4444'}
                style={{ marginRight: 4 }}
              />
            )}
            <Text className={`text-caption font-semibold ${changeColor}`}>
              {changeDisplay} {comparisonLabel}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Three Metric Boxes Row */}
      <View className="flex-row gap-3">
        {/* Positive Responses */}
        <View className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
          <View className="w-8 h-8 rounded-full bg-success-green/10 items-center justify-center mb-2">
            <Ionicons name="thumbs-up" size={16} color="#22C55E" />
          </View>
          <Text className="text-[22px] font-bold text-navy">
            {positiveResponses}
          </Text>
          <Text className="text-caption text-navy/50 mt-0.5">
            Positive{'\n'}Responses
          </Text>
        </View>

        {/* Needs Attention */}
        <View className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
          <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mb-2">
            <Ionicons name="alert-circle" size={16} color="#F97316" />
          </View>
          <Text className="text-[22px] font-bold text-navy">
            {needsAttention}
          </Text>
          <Text className="text-caption text-navy/50 mt-0.5">
            Needs{'\n'}Attention
          </Text>
        </View>

        {/* Response Rate */}
        <View className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-2">
            <Ionicons name="pulse" size={16} color="#3B82F6" />
          </View>
          <Text className="text-[22px] font-bold text-navy">
            {responseRate === null ? '\u2014' : `${responseRate}%`}
          </Text>
          <Text className="text-caption text-navy/50 mt-0.5">
            Response{'\n'}Rate
          </Text>
        </View>
      </View>
    </View>
  );
}
