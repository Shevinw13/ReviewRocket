/**
 * DashboardMetrics component.
 * Displays the primary "Review Opportunities Created" card with a toggleable
 * comparison period (week over week / month over month) and three metric boxes.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeContext';
import type { DashboardMetrics as DashboardMetricsData } from '@/types';

export type ComparisonPeriod = 'day' | 'week' | 'month';

export interface DashboardMetricsProps {
  metrics: DashboardMetricsData;
  weekOverWeekChange?: number | null;
  weekCount?: number;
  dayOverDayChange?: number | null;
  dayCount?: number;
  period?: ComparisonPeriod;
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
  const { colors: t, isDark } = useTheme();

  const period = controlledPeriod ?? internalPeriod;
  const setPeriod = (p: ComparisonPeriod) => {
    setInternalPeriod(p);
    onPeriodChange?.(p);
  };

  const { reviewOpportunities, monthOverMonthChange, positiveResponses, needsAttention, responseRate } = metrics;

  const currentCount = period === 'month' ? reviewOpportunities : period === 'week' ? (weekCount ?? reviewOpportunities) : (dayCount ?? reviewOpportunities);
  const changeValue = period === 'month' ? monthOverMonthChange : period === 'week' ? weekOverWeekChange : dayOverDayChange;
  const periodLabel = period === 'month' ? 'this month' : period === 'week' ? 'this week' : 'today';
  const comparisonLabel = period === 'month' ? 'vs last month' : period === 'week' ? 'vs last week' : 'vs yesterday';

  const previousCount = changeValue !== null && changeValue !== undefined && changeValue !== -100 ? Math.round(currentCount / (1 + changeValue / 100)) : 0;
  const currentLabel = period === 'month' ? 'This Month' : period === 'week' ? 'This Week' : 'Today';
  const previousLabel = period === 'month' ? 'Last Month' : period === 'week' ? 'Last Week' : 'Yesterday';
  const maxCount = Math.max(currentCount, previousCount, 1);

  const changeDisplay = changeValue === null || changeValue === undefined ? 'N/A' : `${changeValue >= 0 ? '+' : ''}${changeValue}%`;
  const changeTextColor = changeValue === null || changeValue === undefined ? t.textMuted : changeValue >= 0 ? '#22C55E' : '#EF4444';

  const pillBg = isDark ? '#2A3A4E' : '#F2F4F7';
  const pillActiveBg = '#0B1D3A';

  return (
    <View>
      {/* Primary Card */}
      <View className="rounded-2xl p-5 mb-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
        {/* Period Toggle */}
        <View className="flex-row items-center mb-3">
          {(['day', 'week', 'month'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg mr-2"
              style={{ backgroundColor: period === p ? pillActiveBg : pillBg }}
              accessibilityRole="button"
            >
              <Text className="text-caption font-semibold" style={{ color: period === p ? '#FFFFFF' : t.textMuted }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-caption font-medium uppercase tracking-wide mb-2" style={{ color: t.textMuted }}>
          Review Opportunities Created
        </Text>
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[40px] font-bold leading-tight" style={{ color: t.text }}>
              {currentCount}
            </Text>
            <Text className="text-caption mt-1" style={{ color: t.textMuted }}>
              {currentCount} {periodLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowChart(!showChart)}
            className="flex-row items-center rounded-xl px-3 py-1.5 active:opacity-70"
            style={{ backgroundColor: pillBg }}
            accessibilityRole="button"
          >
            {changeValue !== null && changeValue !== undefined && (
              <Ionicons
                name={changeValue >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={changeTextColor}
                style={{ marginRight: 4 }}
              />
            )}
            <Text className="text-caption font-semibold" style={{ color: changeTextColor }}>
              {changeDisplay} {comparisonLabel}
            </Text>
          </Pressable>
        </View>

        {/* Bar Chart */}
        {showChart && changeValue !== null && changeValue !== undefined && (
          <View className="mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: t.border }}>
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-caption font-medium" style={{ color: t.text }}>{currentLabel}</Text>
                <Text className="text-caption font-bold" style={{ color: t.text }}>{currentCount}</Text>
              </View>
              <View className="h-7 rounded-lg overflow-hidden" style={{ backgroundColor: pillBg }}>
                <View className="h-7 rounded-lg bg-teal" style={{ width: `${(currentCount / maxCount) * 100}%` }} />
              </View>
            </View>
            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-caption font-medium" style={{ color: t.textMuted }}>{previousLabel}</Text>
                <Text className="text-caption font-bold" style={{ color: t.textMuted }}>{previousCount}</Text>
              </View>
              <View className="h-7 rounded-lg overflow-hidden" style={{ backgroundColor: pillBg }}>
                <View className="h-7 rounded-lg" style={{ width: `${(previousCount / maxCount) * 100}%`, backgroundColor: isDark ? '#4A5A6E' : 'rgba(11,29,58,0.2)' }} />
              </View>
            </View>
            <View className="flex-row items-center justify-center mt-4 rounded-xl py-2" style={{ backgroundColor: pillBg }}>
              <Ionicons name={changeValue >= 0 ? 'arrow-up' : 'arrow-down'} size={14} color={changeTextColor} style={{ marginRight: 4 }} />
              <Text className="text-caption font-semibold" style={{ color: changeTextColor }}>
                {Math.abs(currentCount - previousCount)} {changeValue >= 0 ? 'more' : 'fewer'} than {previousLabel.toLowerCase()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Three Metric Boxes */}
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
          <View className="w-8 h-8 rounded-full bg-success-green/10 items-center justify-center mb-2">
            <Ionicons name="checkmark-outline" size={16} color="#22C55E" />
          </View>
          <Text className="text-[22px] font-bold" style={{ color: t.text }}>{positiveResponses}</Text>
          <Text className="text-caption mt-0.5" style={{ color: t.textMuted }}>{'Positive\nResponses'}</Text>
        </View>

        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
          <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mb-2">
            <Ionicons name="alert-circle-outline" size={16} color="#F97316" />
          </View>
          <Text className="text-[22px] font-bold" style={{ color: t.text }}>{needsAttention}</Text>
          <Text className="text-caption mt-0.5" style={{ color: t.textMuted }}>{'Needs\nFollow-up'}</Text>
        </View>

        <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
          <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mb-2">
            <Ionicons name="trending-up-outline" size={16} color="#3B82F6" />
          </View>
          <Text className="text-[22px] font-bold" style={{ color: t.text }}>{responseRate === null ? '\u2014' : `${responseRate}%`}</Text>
          <Text className="text-caption mt-0.5" style={{ color: t.textMuted }}>{'Response\nRate'}</Text>
        </View>
      </View>
    </View>
  );
}
