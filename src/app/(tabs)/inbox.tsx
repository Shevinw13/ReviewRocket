/**
 * Inbox screen for viewing and managing negative customer feedback.
 * Displays feedback cards with tab filters: "Needs Attention" (unresolved)
 * and "All Feedback" (including resolved).
 *
 * Requirements: 6.1, 6.2, 6.6, 6.7
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useService } from '@/services';
import { useUnresolvedCount } from '@/features/inbox/hooks/useUnresolvedCount';
import { FeedbackCard } from '@/features/inbox/components/FeedbackCard';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { InboxSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { hapticSuccess } from '@/utils/haptics';
import { useUnresolvedFeedback, type EnrichedFeedback } from '@/features/inbox/hooks/useUnresolvedFeedback';
import { useAllFeedback } from '@/features/inbox/hooks/useAllFeedback';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabFilter = 'needs-attention' | 'all';

const INBOX_LAST_VIEWED_KEY = '@nudgli/inbox_last_viewed';

// ─── Inbox Screen ────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const queryClient = useQueryClient();
  const feedbackRepo = useService('feedback');
  const { data: unresolvedCount = 0 } = useUnresolvedCount();

  const [activeTab, setActiveTab] = useState<TabFilter>('needs-attention');
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [lastViewedAt, setLastViewedAt] = useState<Date | null>(null);

  // Load last-viewed timestamp on mount, then update it
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(INBOX_LAST_VIEWED_KEY);
      if (stored) {
        setLastViewedAt(new Date(stored));
      }
      // Update the last-viewed timestamp to now
      await AsyncStorage.setItem(INBOX_LAST_VIEWED_KEY, new Date().toISOString());
    })();
  }, []);

  // ─── Data Fetching ────────────────────────────────────────────────────

  const {
    data: unresolvedFeedback,
    isLoading: unresolvedLoading,
  } = useUnresolvedFeedback();

  const {
    data: allFeedback,
    isLoading: allLoading,
  } = useAllFeedback();

  // ─── Determine active data ────────────────────────────────────────────

  const feedbackList =
    activeTab === 'needs-attention'
      ? unresolvedFeedback ?? []
      : allFeedback ?? [];

  const isLoading =
    activeTab === 'needs-attention' ? unresolvedLoading : allLoading;

  // ─── Pull-to-Refresh ──────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['unresolved-feedback'] }),
        queryClient.invalidateQueries({ queryKey: ['all-feedback'] }),
        queryClient.invalidateQueries({ queryKey: ['unresolved-count'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  // ─── Action Handlers ──────────────────────────────────────────────────

  const handleCall = useCallback((phone: string | undefined, name: string) => {
    if (!phone) {
      Alert.alert(
        'No Phone Number',
        `Unable to call ${name}. No phone number available.`,
      );
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  }, []);

  const handleText = useCallback((phone: string | undefined, name: string) => {
    if (!phone) {
      Alert.alert(
        'No Phone Number',
        `Unable to text ${name}. No phone number available.`,
      );
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`sms:${cleanPhone}`);
  }, []);

  const handleResolve = useCallback(
    async (feedbackId: string) => {
      setResolvingIds((prev) => new Set(prev).add(feedbackId));
      try {
        const result = await feedbackRepo.markResolved(feedbackId);
        if (!result.success) {
          Alert.alert(
            'Error',
            'Unable to mark feedback as resolved. Please try again.',
          );
          return;
        }
        // Invalidate queries to refresh the lists and badge
        hapticSuccess();
        queryClient.invalidateQueries({ queryKey: ['unresolved-feedback'] });
        queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
        queryClient.invalidateQueries({ queryKey: ['unresolved-count'] });
      } catch {
        Alert.alert(
          'Error',
          'Unable to mark feedback as resolved. Please try again.',
        );
      } finally {
        setResolvingIds((prev) => {
          const next = new Set(prev);
          next.delete(feedbackId);
          return next;
        });
      }
    },
    [feedbackRepo, queryClient],
  );

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      {/* Navy Header */}
      <View className="bg-navy px-5 pt-4 pb-6">
        <Text className="text-2xl font-bold text-white">Inbox</Text>
        <Text className="text-sm text-white/60 mt-1">
          Manage customer feedback
        </Text>
      </View>

      <View className="flex-1 bg-card-bg rounded-t-3xl -mt-2 pt-4">
        {/* Tab Filters */}
        <View className="flex-row px-5 mb-4 gap-2">
        {/* Needs Attention Tab */}
        <Pressable
          onPress={() => setActiveTab('needs-attention')}
          className={`flex-row items-center px-4 py-2.5 rounded-xl ${
            activeTab === 'needs-attention'
              ? 'bg-navy'
              : 'bg-white border border-light-gray'
          }`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'needs-attention' }}
          accessibilityLabel={`Needs Attention tab, ${unresolvedCount} items`}
        >
          <Text
            className={`text-caption font-medium ${
              activeTab === 'needs-attention' ? 'text-white' : 'text-navy'
            }`}
          >
            Needs Attention
          </Text>
          {unresolvedCount > 0 && (
            <View className="ml-2">
              <Badge count={unresolvedCount} />
            </View>
          )}
        </Pressable>

        {/* All Feedback Tab */}
        <Pressable
          onPress={() => setActiveTab('all')}
          className={`flex-row items-center px-4 py-2.5 rounded-xl ${
            activeTab === 'all'
              ? 'bg-navy'
              : 'bg-white border border-light-gray'
          }`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
          accessibilityLabel="All Feedback tab"
        >
          <Text
            className={`text-caption font-medium ${
              activeTab === 'all' ? 'text-white' : 'text-navy'
            }`}
          >
            All Feedback
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading && feedbackList.length === 0 ? (
        <InboxSkeleton />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-12"
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
          {feedbackList.length === 0 ? (
            /* Empty State */
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-success-green/10 items-center justify-center mb-4">
                <Ionicons
                  name="checkmark-circle"
                  size={36}
                  color="#22C55E"
                />
              </View>
              <Text className="text-body font-bold text-navy text-center">
                {activeTab === 'needs-attention'
                  ? 'All caught up!'
                  : 'No feedback yet'}
              </Text>
              <Text className="text-caption text-navy/50 text-center mt-2 px-8">
                {activeTab === 'needs-attention'
                  ? 'No items need your attention right now. Keep up the great work!'
                  : 'Feedback from customers will appear here once received.'}
              </Text>
            </View>
          ) : (
            <>
              {/* Feedback Cards */}
              {feedbackList.map((item: EnrichedFeedback) => (
                <FeedbackCard
                  key={item.id}
                  customerName={item.customerName}
                  rating={item.rating}
                  feedbackText={item.feedbackText}
                  jobNote={item.serviceType}
                  createdAt={new Date(item.createdAt)}
                  isResolved={item.isResolved}
                  isNew={lastViewedAt ? new Date(item.createdAt) > lastViewedAt : false}
                  onCall={() => handleCall(item.customerPhone, item.customerName)}
                  onText={() => handleText(item.customerPhone, item.customerName)}
                  onResolve={() => handleResolve(item.id)}
                  isResolving={resolvingIds.has(item.id)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
      </View>
    </SafeAreaView>
  );
}
