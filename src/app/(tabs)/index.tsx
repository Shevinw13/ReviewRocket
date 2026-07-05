/**
 * Dashboard screen (Home tab).
 * Displays greeting, metrics overview, CTA button, and recent activity.
 * This is the default screen for authenticated users.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
 */

import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { useDashboardMetrics } from '@/features/dashboard/hooks/useDashboardMetrics';
import { useRecentActivity } from '@/features/dashboard/hooks/useRecentActivity';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';
import type { ComparisonPeriod } from '@/features/dashboard/components/DashboardMetrics';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import type { DashboardMetrics as DashboardMetricsType, ActivityItem } from '@/types';

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

// ─── Empty Metrics ───────────────────────────────────────────────────────────

const EMPTY_METRICS: DashboardMetricsType = {
  reviewOpportunities: 0,
  monthOverMonthChange: null,
  positiveResponses: 0,
  needsAttention: 0,
  requestsSent: 0,
  responseRate: null,
};

// ─── Dashboard Screen ────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useBusinessProfile();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ComparisonPeriod>('month');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInitialLoading = profileLoading || metricsLoading || activityLoading;

  // ─── Pull-to-Refresh ────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Set a 10-second timeout to stop refreshing regardless
    const timeout = setTimeout(() => {
      setRefreshing(false);
    }, 10_000);
    timeoutRef.current = timeout;

    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['recent-activity'] }),
      ]);
    } finally {
      clearTimeout(timeout);
      timeoutRef.current = null;
      setRefreshing(false);
    }
  }, [queryClient]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const displayMetrics = metrics ?? EMPTY_METRICS;
  const activity = recentActivity ?? [];

  // Filter activity by selected period
  const filteredActivity = activity.filter((item) => {
    const itemDate = new Date(item.createdAt);
    const now = new Date();
    if (selectedPeriod === 'day') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return itemDate >= startOfDay;
    }
    if (selectedPeriod === 'week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      return itemDate >= startOfWeek;
    }
    // month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return itemDate >= startOfMonth;
  });

  const hasData =
    displayMetrics.reviewOpportunities > 0 ||
    displayMetrics.positiveResponses > 0 ||
    displayMetrics.needsAttention > 0 ||
    displayMetrics.requestsSent > 0 ||
    activity.length > 0;

  if (isInitialLoading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
        <View className="bg-navy px-5 pt-6 pb-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
              <View style={{ width: 180, height: 24, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </View>
          </View>
        </View>
        <ScrollView className="flex-1 bg-card-bg" contentContainerClassName="pb-12">
          <DashboardSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <ScrollView
        className="flex-1 bg-card-bg"
        contentContainerClassName="pb-12"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0CBFA6"
            colors={['#0CBFA6']}
          />
        }
      >
        {/* Navy Header Section */}
        <View className="bg-navy px-5 pt-6 pb-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm text-white/60">
                {new Date().getHours() < 12
                  ? 'Good morning'
                  : new Date().getHours() < 18
                    ? 'Good afternoon'
                    : 'Good evening'}
              </Text>
              <Text className="text-2xl font-bold text-white mt-1">
                {profile?.businessName ?? 'Dashboard'}
              </Text>
            </View>
            <View className="h-10 w-10 rounded-full overflow-hidden">
              <Image
                source={require("../../../assets/applogo.png")}
                className="h-10 w-10"
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* Content area overlapping the navy */}
        <View className="px-5 -mt-4">
          {!hasData ? (
            /* Empty State — Welcome Card */
            <View className="bg-white rounded-2xl p-6 border border-light-gray items-center shadow-sm shadow-black/5">
              <View className="w-16 h-16 rounded-full bg-teal/10 items-center justify-center mb-4">
                <Ionicons name="rocket-outline" size={32} color="#0CBFA6" />
              </View>
              <Text className="text-body font-bold text-navy text-center mb-2">
                Ready to get your first review?
              </Text>
              <Text className="text-caption text-navy/60 text-center mb-6 px-4">
                Send a text to your last customer and watch the feedback roll in.
              </Text>
              <Pressable
                onPress={() => router.push('/send-request')}
                className="bg-teal rounded-2xl py-4 px-8 flex-row items-center justify-center active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Send Your First Request"
              >
                <Ionicons name="add" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-body font-bold text-white">
                  Send Your First Request
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Google Review URL Missing Banner */}
              {profile && !profile.googleReviewUrl && (
                <Pressable
                  onPress={() => router.push('/edit-business')}
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex-row items-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Add your Google Review link"
                >
                  <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center mr-3">
                    <Ionicons name="link-outline" size={18} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-body font-medium text-navy">
                      Add your Google Review link
                    </Text>
                    <Text className="text-caption text-navy/60 mt-0.5">
                      Happy customers will be directed to leave a public review
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
              )}

              {/* Metrics Section */}
              <DashboardMetrics
                metrics={displayMetrics}
                weekOverWeekChange={metrics?.weekOverWeekChange ?? null}
                weekCount={metrics?.weekCount ?? 0}
                period={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
              />

              {/* CTA Button */}
              <Pressable
                onPress={() => router.push('/send-request')}
                className="mt-6 bg-teal rounded-2xl py-4 flex-row items-center justify-center active:opacity-80 shadow-sm shadow-teal/20"
                accessibilityRole="button"
                accessibilityLabel="Send Review Request"
              >
                <Ionicons name="add" size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-body font-bold text-white">
                  Send Review Request
                </Text>
              </Pressable>

              {/* Recent Activity Section */}
              <View className="mt-8">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-body font-bold text-navy">
                    Recent Activity
                  </Text>
                  {activity.length > 0 && (
                    <Pressable
                      onPress={() => router.push('/history')}
                      accessibilityRole="link"
                      accessibilityLabel="View all activity"
                    >
                      <Text className="text-caption font-medium text-teal">
                        View all
                      </Text>
                    </Pressable>
                  )}
                </View>

                {filteredActivity.length === 0 ? (
                  /* Empty State */
                  <View className="bg-white rounded-2xl p-6 border border-light-gray items-center">
                    <Ionicons name="chatbubbles-outline" size={32} color="#E5E7EB" />
                    <Text className="text-body text-navy/40 mt-3 text-center">
                      {selectedPeriod === 'day'
                        ? 'No activity today'
                        : selectedPeriod === 'week'
                          ? 'No activity this week'
                          : 'No activity yet'}
                    </Text>
                    <Text className="text-caption text-navy/30 mt-1 text-center">
                      {selectedPeriod === 'month'
                        ? 'Send your first review request to see feedback here'
                        : 'Activity from this period will show up here'}
                    </Text>
                  </View>
                ) : (
                  /* Activity Items */
                  <View className="bg-white rounded-2xl border border-light-gray overflow-hidden">
                    {filteredActivity.map((item: ActivityItem, index: number) => (
                      <View
                        key={item.id}
                        className={`flex-row items-center px-4 py-3 ${
                          index < filteredActivity.length - 1 ? 'border-b border-light-gray' : ''
                        }`}
                      >
                        {/* Icon / Avatar based on type */}
                        {item.type === 'rating' && item.rating != null && item.rating >= 4 && (
                          <View className="w-9 h-9 rounded-full bg-success-green/10 items-center justify-center mr-3">
                            <Ionicons name="star" size={18} color="#22C55E" />
                          </View>
                        )}
                        {item.type === 'rating' && (item.rating == null || item.rating < 4) && (
                          <View className="w-9 h-9 rounded-full bg-card-bg items-center justify-center mr-3">
                            <Ionicons name="person" size={18} color="#9CA3AF" />
                          </View>
                        )}
                        {item.type === 'sms_opt_out' && (
                          <View className="w-9 h-9 rounded-full bg-teal/10 items-center justify-center mr-3">
                            <Ionicons name="information-circle" size={20} color="#0CBFA6" />
                          </View>
                        )}
                        {item.type === 'sms_opt_in' && (
                          <View className="w-9 h-9 rounded-full bg-green-50 items-center justify-center mr-3">
                            <Ionicons name="checkmark-circle-outline" size={20} color="#22C55E" />
                          </View>
                        )}

                        {/* Content based on type */}
                        <View className="flex-1">
                          {item.type === 'rating' && (
                            <>
                              <Text className="text-body font-medium text-navy" numberOfLines={1}>
                                {item.customerName || 'Customer'}
                              </Text>
                              {item.rating != null && (
                                <View className="flex-row items-center mt-0.5">
                                  {renderStars(item.rating)}
                                </View>
                              )}
                            </>
                          )}
                          {item.type === 'sms_opt_out' && (
                            <Text className="text-body font-medium text-navy" numberOfLines={2}>
                              {item.customerName || item.customerPhoneFormatted || 'A customer'} opted out of SMS messaging
                            </Text>
                          )}
                          {item.type === 'sms_opt_in' && (
                            <Text className="text-body font-medium text-navy" numberOfLines={2}>
                              {item.customerName || item.customerPhoneFormatted || 'A customer'} opted back in to SMS messaging
                            </Text>
                          )}
                        </View>

                        {/* Time Ago */}
                        <Text className="text-caption text-navy/40">
                          {getTimeAgo(new Date(item.createdAt))}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
