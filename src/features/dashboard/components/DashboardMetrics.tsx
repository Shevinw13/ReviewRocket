/**
 * DashboardMetrics component.
 * Displays the primary "Review Opportunities Created" card with a toggleable
 * comparison period (week over week / month over month) and three metric boxes.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { DashboardMetrics as DashboardMetricsData } from '@/types';

export type ComparisonPeriod = 'day' | 'week' | 'month';

export interface DashboardMetricsProps {
  metrics: DashboardMetricsData;
  /** Week-over-week data (optional — if not provided, WoW toggle won't show change) */
  weekOverWeekChange?: number | null;
  weekCount?: number;
  /** Day-level data (optional) */
  dayOverDayChange?: number | null;
  dayCount?: number;
  /** Controlled period (if provided, component won't manage its own state) */
  period?: ComparisonPeriod;
  /** Called when period changes */
  onPeriodChange?: (period: ComparisonPeriod) => void;
}

export function DashboardMetrics({
  metrics,
  weekOverWeekChange = null,
  weekCount,
  dayOverDayChange = null,
  dayCount,
  period: controlledPeriod,
  onPeriodChange,
}: DashboardMetricsProps) {
  const [internalPeriod, setInternalPeriod] = useState<ComparisonPeriod>('month');
  const [showChart, setShowChart] = useState(false);

  const period = controlledPeriod ?? internalPeriod;
  const setPeriod = (p: ComparisonPeriod) => {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  };

  const {
    reviewOpportunities,
    monthOverMonthChange,
    positiveResponses,
    needsAttention,
    responseRate,
  } = metrics;

  // Determine which values to show based on selected period
  const currentCount =
    period === 'month' ? reviewOpportunities
    : period === 'week' ? (weekCount ?? reviewOpportunities)
    : (dayCount ?? reviewOpportunities);
  const changeValue =
    period === 'month' ? monthOverMonthChange
    : period === 'week' ? weekOverWeekChange
    : dayOverDayChange;
  const periodLabel =
    period === 'month' ? 'this month'
    : period === 'week' ? 'this week'
    : 'today';
  const comparisonLabel =
    period === 'month' ? 'vs last month'
    : period === 'week' ? 'vs last week'
    : 'vs yesterday';

  // Calculate previous period count from change percentage
  const previousCount =
    changeValue !== null && changeValue !== undefined && changeValue !== -100
      ? Math.round(currentCount / (1 + changeValue / 100))
      : 0;

  const currentLabel =
    period === 'month' ? 'This Month'
    : period === 'week' ? 'This Week'
    : 'Today';
  const previousLabel =
    period === 'month' ? 'Last Month'
    : period === 'week' ? 'Last Week'
    : 'Yesterday';

  // Bar chart scaling
  const maxCount = Math.max(currentCount, previousCount, 1);

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

  return (
    <View>
      {/* Primary Card — Review Opportunities Created */}
      <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm shadow-black/5 border border-light-gray">
        {/* Period Toggle - visible segmented control */}
        <View className="flex-row items-center mb-3">
          <Pressable
            onPress={() => setPeriod('day')}
            className={`px-3 py-1.5 rounded-lg mr-2 ${
              period === 'day' ? 'bg-navy' : 'bg-card-bg'
            }`}
            accessibilityRole="button"
            accessibilityLabel="View daily data"
          >
            <Text className={`text-caption font-semibold ${
              period === 'day' ? 'text-white' : 'text-navy/60'
            }`}>
              Day
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriod('week')}
            className={`px-3 py-1.5 rounded-lg mr-2 ${
              period === 'week' ? 'bg-navy' : 'bg-card-bg'
            }`}
            accessibilityRole="button"
            accessibilityLabel="View weekly data"
          >
            <Text className={`text-caption font-semibold ${
              period === 'week' ? 'text-white' : 'text-navy/60'
            }`}>
              Week
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-lg ${
              period === 'month' ? 'bg-navy' : 'bg-card-bg'
            }`}
            accessibilityRole="button"
            accessibilityLabel="View monthly data"
          >
            <Text className={`text-caption font-semibold ${
              period === 'month' ? 'text-white' : 'text-navy/60'
            }`}>
              Month
            </Text>
          </Pressable>
        </View>

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
            onPress={() => setShowChart(!showChart)}
            className="flex-row items-center bg-card-bg rounded-xl px-3 py-1.5 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={`${changeDisplay} ${comparisonLabel}. Tap to ${showChart ? 'hide' : 'show'} chart`}
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

        {/* Comparison Bar Chart (expandable) */}
        {showChart && changeValue !== null && changeValue !== undefined && (
          <View className="mt-5 pt-4 border-t border-light-gray">
            {/* Current Period Bar */}
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-caption font-medium text-navy">{currentLabel}</Text>
                <Text className="text-caption font-bold text-navy">{currentCount}</Text>
              </View>
              <View className="h-7 bg-card-bg rounded-lg overflow-hidden">
                <View
                  className="h-7 rounded-lg bg-teal"
                  style={{ width: `${(currentCount / maxCount) * 100}%` }}
                />
              </View>
            </View>

            {/* Previous Period Bar */}
            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-caption font-medium text-navy/60">{previousLabel}</Text>
                <Text className="text-caption font-bold text-navy/60">{previousCount}</Text>
              </View>
              <View className="h-7 bg-card-bg rounded-lg overflow-hidden">
                <View
                  className="h-7 rounded-lg bg-navy/20"
                  style={{ width: `${(previousCount / maxCount) * 100}%` }}
                />
              </View>
            </View>

            {/* Change Summary */}
            <View className="flex-row items-center justify-center mt-4 bg-card-bg rounded-xl py-2">
              <Ionicons
                name={changeValue >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={changeValue >= 0 ? '#22C55E' : '#EF4444'}
                style={{ marginRight: 4 }}
              />
              <Text className={`text-caption font-semibold ${changeColor}`}>
                {Math.abs(currentCount - previousCount)} {changeValue >= 0 ? 'more' : 'fewer'} than {previousLabel.toLowerCase()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Three Metric Boxes Row */}
      <View className="flex-row gap-3">
        {/* Positive Responses */}
        <View className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
          <View className="w-8 h-8 rounded-full bg-success-green/10 items-center justify-center mb-2">
            <Ionicons name="checkmark-outline" size={16} color="#22C55E" />
          </View>
          <Text className="text-[22px] font-bold text-navy">
            {positiveResponses}
          </Text>
          <Text className="text-caption text-navy/50 mt-0.5">
            Positive{'\n'}Responses
          </Text>
        </View>

        {/* Needs Follow-up */}
        <View className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
          <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mb-2">
            <Ionicons name="alert-circle-outline" size={16} color="#F97316" />
          </View>
          <Text className="text-[22px] font-bold text-navy">
            {needsAttention}
          </Text>
          <Text className="text-caption text-navy/50 mt-0.5">
            Needs{'\n'}Follow-up
          </Text>
        </View>

        {/* Response Rate */}
        <View className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-2">
            <Ionicons name="trending-up-outline" size={16} color="#3B82F6" />
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
