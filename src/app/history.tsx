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
    return { text: 'Positive', color: 'text-success-green', icon: 'checkmark-circle' };
  }
  if (request.rating != null && request.rating <= 3) {
    return { text: 'Needs follow-up', color: 'text-orange-500', icon: 'alert-circle' };
  }
  if (request.status === 'sent' || request.status === 'delivered') {
    return { text: 'Awaiting reply', color: 'text-navy/50', icon: 'time-outline' };
  }
  if (request.status === 'expired') {
    return { text: 'No response', color: 'text-navy/40', icon: 'close-circle-outline' };
  }
  if (request.status === 'failed') {
    return { text: 'Failed to send', color: 'text-red-500', icon: 'warning-outline' };
  }
  return { text: 'Sent', color: 'text-navy/50', icon: 'time-outline' };
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-card-bg" edges={['top']}>
      {/* Header with back button */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 p-2"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0B1D3A" />
        </Pressable>
        <Text className="text-heading font-bold text-navy flex-1">
          Request History
        </Text>
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
                className={`bg-white rounded-2xl border mb-3 overflow-hidden active:opacity-90 ${
                  isExpanded ? 'border-teal/30' : 'border-light-gray'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`${customerName}, ${status.text}`}
              >
                {/* Main Row */}
                <View className="flex-row items-center px-4 py-3.5">
                  {/* Avatar */}
                  <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#9CA3AF" />
                  </View>

                  {/* Customer Info */}
                  <View className="flex-1">
                    <Text className="text-body font-semibold text-navy" numberOfLines={1}>
                      {customerName}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      {request.rating != null ? (
                        <View className="flex-row items-center">
                          {renderStars(request.rating)}
                        </View>
                      ) : (
                        <Text className={`text-caption ${status.color}`}>
                          {status.text}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Date + Chevron */}
                  <View className="items-end">
                    <Text className="text-caption text-navy/40">
                      {formatDate(request.createdAt)}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#9CA3AF"
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                  <View className="px-4 pb-4 pt-1 border-t border-light-gray">
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
                      <Text className={`text-caption font-medium ml-1.5 ${status.color}`}>
                        {status.text}
                      </Text>
                      {request.serviceType && (
                        <>
                          <Text className="text-caption text-navy/30 mx-2">•</Text>
                          <Text className="text-caption text-navy/50">
                            {request.serviceType}
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => handleCall(request.customerPhone, customerName)}
                        className="flex-row items-center bg-card-bg rounded-xl px-3 py-2 active:opacity-70"
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${customerName}`}
                      >
                        <Ionicons name="call-outline" size={16} color="#0B1D3A" />
                        <Text className="text-caption font-medium text-navy ml-1.5">
                          Call
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleText(request.customerPhone, customerName)}
                        className="flex-row items-center bg-card-bg rounded-xl px-3 py-2 active:opacity-70"
                        accessibilityRole="button"
                        accessibilityLabel={`Text ${customerName}`}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color="#0B1D3A" />
                        <Text className="text-caption font-medium text-navy ml-1.5">
                          Text
                        </Text>
                      </Pressable>

                      {request.status === 'sent' || request.status === 'delivered' ? (
                        <View className="flex-row items-center bg-teal/5 rounded-xl px-3 py-2">
                          <Ionicons name="time-outline" size={16} color="#0CBFA6" />
                          <Text className="text-caption font-medium text-teal ml-1.5">
                            Waiting...
                          </Text>
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
                          <Text className="text-caption font-medium text-teal ml-1.5">
                            Send Again
                          </Text>
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
