/**
 * Customer History screen.
 * Shows ALL review requests sorted by most recent first.
 * Each row is tappable to expand and show details + actions (call, text).
 *
 * UX Improvement: Customer History Screen (View All)
 */

import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { useTheme } from '@/theme/ThemeContext';
import { exportFeedbackCsv } from '@/utils/exportCsv';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import type { ReviewRequest } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusLabel(request: ReviewRequest): { text: string; color: string; icon: string } {
  if (request.rating != null && request.rating >= 4) {
    return { text: 'Positive', color: '#22C55E', icon: 'checkmark-circle' };
  }
  if (request.rating != null && request.rating <= 3) {
    return { text: 'Needs follow-up', color: '#F97316', icon: 'alert-circle' };
  }
  if (request.status === 'sent' || request.status === 'delivered') {
    return { text: 'Awaiting reply', color: '#9CA3AF', icon: 'time-outline' };
  }
  if (request.status === 'expired') {
    return { text: 'No response', color: '#9CA3AF', icon: 'close-circle-outline' };
  }
  if (request.status === 'failed') {
    return { text: 'Failed to send', color: '#EF4444', icon: 'warning-outline' };
  }
  return { text: 'Sent', color: '#9CA3AF', icon: 'time-outline' };
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

// ─── History Screen ──────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const reviewRequestRepo = useService('reviewRequests');
  const { data: profile } = useBusinessProfile();
  const { colors: t, isDark } = useTheme();
  const businessId = profile?.id;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery<ReviewRequest[]>({
    queryKey: ['all-review-requests', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const result = await reviewRequestRepo.getRecentByBusiness(businessId, 100);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return [...result.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const allRequests = requests ?? [];

  const handleCall = useCallback((phone: string | undefined, name: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', `Unable to call ${name}. No phone number available.`);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  }, []);

  const handleText = useCallback((phone: string | undefined, name: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', `Unable to text ${name}. No phone number available.`);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`sms:${cleanPhone}`);
  }, []);

  const handleExport = useCallback(async () => {
    if (allRequests.length === 0) {
      Alert.alert('No Data', 'No requests to export yet.');
      return;
    }
    try {
      await exportFeedbackCsv(allRequests);
    } catch {
      Alert.alert('Export Failed', 'Unable to export feedback. Please try again.');
    }
  }, [allRequests]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: t.bg }} edges={['top']}>
      {/* Header with back button */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 p-2"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </Pressable>
        <Text className="text-heading font-bold flex-1" style={{ color: t.text }}>
          Request History
        </Text>
        <Pressable
          onPress={handleExport}
          className="p-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Export feedback as CSV"
        >
          <Ionicons name="download-outline" size={22} color="#0CBFA6" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <LoadingIndicator size="large" />
        </View>
      ) : allRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <View className="bg-white rounded-2xl p-6 border border-light-gray items-center">
            <Ionicons name="document-text-outline" size={32} color="#E5E7EB" />
            <Text className="text-body text-navy/40 mt-3 text-center">
              No requests yet
            </Text>
            <Text className="text-caption text-navy/30 mt-1 text-center">
              Send your first review request to see history here
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-12"
          showsVerticalScrollIndicator={false}
        >
          {allRequests.map((request) => {
            const status = getStatusLabel(request);
            const isExpanded = expandedId === request.id;
            const customerName = request.customerName || 'Customer';

            return (
              <Pressable
                key={request.id}
                onPress={() => toggleExpand(request.id)}
                className={`rounded-2xl border mb-3 overflow-hidden active:opacity-90`}
                style={{
                  backgroundColor: t.cardBg,
                  borderColor: isExpanded ? '#0CBFA6' : t.border,
                }}
                accessibilityRole="button"
                accessibilityLabel={`${customerName}, ${status.text}`}
              >
                {/* Main Row */}
                <View className="flex-row items-center px-4 py-3.5">
                  {/* Avatar */}
                  <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: isDark ? '#2A3A4E' : '#F2F4F7' }}>
                    <Ionicons name="person" size={20} color="#9CA3AF" />
                  </View>

                  {/* Customer Info */}
                  <View className="flex-1">
                    <Text className="text-body font-semibold" style={{ color: t.text }} numberOfLines={1}>
                      {customerName}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      {request.rating != null ? (
                        <View className="flex-row items-center">
                          {renderStars(request.rating)}
                        </View>
                      ) : (
                        <Text className="text-caption" style={{ color: status.color }}>
                          {status.text}
                        </Text>
                      )}
                      {request.serviceType && (
                        <Text className="text-caption ml-2" style={{ color: t.textMuted }} numberOfLines={1}>
                          · {request.serviceType}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Date + Chevron */}
                  <View className="items-end">
                    <Text className="text-caption" style={{ color: t.textMuted }}>
                      {formatDate(request.createdAt)}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={t.textMuted}
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View className="px-4 pb-4 pt-1" style={{ borderTopWidth: 1, borderTopColor: t.border }}>
                    {/* Status + Service Info */}
                    <View className="flex-row items-center mb-3 mt-2">
                      <Ionicons
                        name={status.icon as any}
                        size={16}
                        color={
                          status.color.includes('green') ? '#22C55E'
                          : status.color.includes('orange') ? '#F97316'
                          : status.color.includes('red') ? '#EF4444'
                          : '#9CA3AF'
                        }
                      />
                      <Text className="text-caption font-medium ml-1.5" style={{ color: t.textSecondary }}>
                        {status.text}
                      </Text>
                      {request.serviceType && (
                        <>
                          <Text className="text-caption mx-2" style={{ color: t.textMuted }}>•</Text>
                          <Text className="text-caption" style={{ color: t.textMuted }}>
                            {request.serviceType}
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleCall(request.customerPhone, customerName)}
                        className="flex-row items-center rounded-xl px-3 py-2 active:opacity-70"
                        style={{ backgroundColor: isDark ? '#2A3A4E' : '#F2F4F7' }}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${customerName}`}
                      >
                        <Ionicons name="call-outline" size={16} color={t.text} />
                        <Text className="text-caption font-medium ml-1.5" style={{ color: t.text }}>Call</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleText(request.customerPhone, customerName)}
                        className="flex-row items-center rounded-xl px-3 py-2 active:opacity-70"
                        style={{ backgroundColor: isDark ? '#2A3A4E' : '#F2F4F7' }}
                        accessibilityRole="button"
                        accessibilityLabel={`Text ${customerName}`}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color={t.text} />
                        <Text className="text-caption font-medium ml-1.5" style={{ color: t.text }}>Text</Text>
                      </Pressable>

                      {request.status === 'sent' || request.status === 'delivered' ? (
                        <View className="flex-row items-center bg-teal/5 rounded-xl px-3 py-2">
                          <Ionicons name="time-outline" size={16} color="#0CBFA6" />
                          <Text className="text-caption font-medium text-teal ml-1.5">Waiting...</Text>
                        </View>
                      ) : null}

                      {request.status === 'expired' && (
                        <Pressable
                          onPress={() => {
                            router.push({
                              pathname: '/send-request',
                              params: {
                                prefillName: request.customerName || '',
                                prefillPhone: request.customerPhone || '',
                              },
                            });
                          }}
                          className="flex-row items-center bg-teal/10 rounded-xl px-3 py-2 active:opacity-70"
                          accessibilityRole="button"
                          accessibilityLabel={`Send again to ${customerName}`}
                        >
                          <Ionicons name="refresh-outline" size={16} color="#0CBFA6" />
                          <Text className="text-caption font-medium text-teal ml-1.5">Send Again</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
