/**
 * Inbox screen for viewing and managing negative customer feedback.
 * Displays feedback cards with tab filters: "Needs Attention" (unresolved)
 * and "All Feedback" (including resolved).
 *
 * Requirements: 6.1, 6.2, 6.6, 6.7
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { useService } from '@/services';
import { useUnresolvedCount } from '@/features/inbox/hooks/useUnresolvedCount';
import { FeedbackCard } from '@/features/inbox/components/FeedbackCard';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { InboxSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { hapticSuccess } from '@/utils/haptics';
import { useTheme } from '@/theme/ThemeContext';
import { useUnresolvedFeedback, type EnrichedFeedback } from '@/features/inbox/hooks/useUnresolvedFeedback';
import { useAllFeedback } from '@/features/inbox/hooks/useAllFeedback';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabFilter = 'needs-attention' | 'all';

const INBOX_LAST_VIEWED_KEY = '@nudgli/inbox_last_viewed';
const UNDO_TIMEOUT_MS = 3000;

// ─── Inbox Screen ────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const queryClient = useQueryClient();
  const feedbackRepo = useService('feedback');
  const { data: unresolvedCount = 0 } = useUnresolvedCount();
  const { colors: t } = useTheme();

  const [activeTab, setActiveTab] = useState<TabFilter>('needs-attention');
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [lastViewedAt, setLastViewedAt] = useState<Date | null>(null);
  const [undoItem, setUndoItem] = useState<{ id: string; name: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoOpacity = useRef(new Animated.Value(0)).current;

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
    async (feedbackId: string, customerName?: string) => {
      // Show undo toast — delay the actual resolve
      setUndoItem({ id: feedbackId, name: customerName || 'Feedback' });

      // Animate toast in
      Animated.timing(undoOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Optimistically hide the card
      setResolvingIds((prev) => new Set(prev).add(feedbackId));

      // Set timer to commit the resolve
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(async () => {
        // Actually resolve
        try {
          const result = await feedbackRepo.markResolved(feedbackId);
          if (result.success) {
            hapticSuccess();
            queryClient.invalidateQueries({ queryKey: ['unresolved-feedback'] });
            queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
            queryClient.invalidateQueries({ queryKey: ['unresolved-count'] });
          }
        } catch {
          // If resolve fails, restore the card
          setResolvingIds((prev) => {
            const next = new Set(prev);
            next.delete(feedbackId);
            return next;
          });
        }
        // Hide toast
        Animated.timing(undoOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setUndoItem(null));
      }, UNDO_TIMEOUT_MS);
    },
    [feedbackRepo, queryClient, undoOpacity],
  );

  const handleUndo = useCallback(() => {
    // Cancel the pending resolve
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (undoItem) {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(undoItem.id);
        return next;
      });
    }
    // Hide toast
    Animated.timing(undoOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setUndoItem(null));
  }, [undoItem, undoOpacity]);

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

      <View className="flex-1 rounded-t-3xl -mt-2 pt-4" style={{ backgroundColor: t.bg }}>
        {/* Tab Filters */}
        <View className="flex-row px-5 mb-4 gap-2">
        {/* Needs Attention Tab */}
        <Pressable
          onPress={() => setActiveTab('needs-attention')}
          className="flex-row items-center px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: activeTab === 'needs-attention' ? '#0B1D3A' : t.cardBg,
            borderWidth: activeTab === 'needs-attention' ? 0 : 1,
            borderColor: t.border,
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'needs-attention' }}
          accessibilityLabel={`Needs Attention tab, ${unresolvedCount} items`}
        >
          <Text
            className="text-caption font-medium"
            style={{ color: activeTab === 'needs-attention' ? '#FFFFFF' : t.text }}
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
          className="flex-row items-center px-4 py-2.5 rounded-xl"
          style={{
            backgroundColor: activeTab === 'all' ? '#0B1D3A' : t.cardBg,
            borderWidth: activeTab === 'all' ? 0 : 1,
            borderColor: t.border,
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'all' }}
          accessibilityLabel="All Feedback tab"
        >
          <Text
            className="text-caption font-medium"
            style={{ color: activeTab === 'all' ? '#FFFFFF' : t.text }}
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
                  name={activeTab === 'needs-attention' ? 'checkmark-circle' : 'chatbubble-ellipses-outline'}
                  size={36}
                  color={activeTab === 'needs-attention' ? '#22C55E' : '#0CBFA6'}
                />
              </View>
              <Text className="text-body font-bold text-center" style={{ color: t.text }}>
                {activeTab === 'needs-attention'
                  ? 'All caught up!'
                  : 'No feedback yet'}
              </Text>
              <Text className="text-caption text-center mt-2 px-8" style={{ color: t.textMuted }}>
                {activeTab === 'needs-attention'
                  ? 'No items need your attention right now. Keep up the great work!'
                  : 'Send your first review request and feedback will appear here.'}
              </Text>
              {activeTab === 'all' && (
                <Pressable
                  onPress={() => router.push('/send-request')}
                  className="mt-5 bg-teal rounded-xl px-6 py-3 flex-row items-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Send your first review request"
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text className="text-caption font-bold text-white">Send Review Request</Text>
                </Pressable>
              )}
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
                  onResolve={() => handleResolve(item.id, item.customerName)}
                  isResolving={resolvingIds.has(item.id)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
      </View>

      {/* Undo Resolve Toast */}
      {undoItem && (
        <Animated.View
          style={{ opacity: undoOpacity }}
          className="absolute bottom-24 left-5 right-5"
        >
          <View className="bg-navy rounded-xl px-4 py-3 flex-row items-center justify-between shadow-lg">
            <View className="flex-row items-center flex-1">
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text className="text-caption font-medium text-white ml-2" numberOfLines={1}>
                Resolved
              </Text>
            </View>
            <Pressable
              onPress={handleUndo}
              className="ml-3 px-3 py-1.5 rounded-lg bg-white/15 active:bg-white/25"
              accessibilityRole="button"
              accessibilityLabel="Undo resolve"
            >
              <Text className="text-caption font-bold text-teal">Undo</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
