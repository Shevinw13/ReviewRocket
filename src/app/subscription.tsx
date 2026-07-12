/**
 * Subscription screen for selecting or changing subscription tier.
 *
 * Navigated to from Settings ("Upgrade Plan") or when SMS quota is exceeded
 * on the Send Request screen.
 *
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */

import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { type SubscriptionTier } from '@/types';
import { useSubscription } from '@/features/subscription/hooks/useSubscription';
import { SubscriptionTierPicker } from '@/features/subscription/components/SubscriptionTierPicker';
import { ErrorIndicator } from '@/components/ui/ErrorIndicator';

// ─── Subscription Screen ─────────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const params = useLocalSearchParams<{ quotaExceeded?: string }>();
  const isQuotaExceeded = params.quotaExceeded === 'true';

  const {
    currentTier,
    isPurchasing,
    purchaseError,
    purchaseTier,
    clearError,
    tiers,
  } = useSubscription();

  const [purchasingTier, setPurchasingTier] = useState<SubscriptionTier | null>(null);

  const handleSelectTier = useCallback(
    async (tier: SubscriptionTier) => {
      setPurchasingTier(tier);
      await purchaseTier(tier);
      setPurchasingTier(null);
    },
    [purchaseTier],
  );

  return (
    <SafeAreaView className="flex-1 bg-card-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back button */}
        <View className="flex-row items-center pt-4 pb-2">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 p-2"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#0B1D3A" />
          </Pressable>
          <Text className="text-heading font-bold text-navy flex-1">
            Subscription
          </Text>
        </View>

        {/* Quota exceeded banner */}
        {isQuotaExceeded && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex-row items-start">
            <Ionicons
              name="warning"
              size={20}
              color="#EF4444"
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text className="text-body font-semibold text-red-700 mb-1">
                SMS Quota Exceeded
              </Text>
              <Text className="text-caption text-red-600">
                You've reached your monthly SMS limit. Upgrade your plan to
                continue sending review requests.
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        <Text className="text-body text-navy/70 mb-6">
          Choose the plan that fits your business. Upgrade or downgrade anytime.
        </Text>

        {/* Purchase error */}
        {purchaseError && (
          <View className="mb-4">
            <ErrorIndicator
              message={purchaseError}
              onDismiss={clearError}
            />
          </View>
        )}

        {/* Tier Picker */}
        <SubscriptionTierPicker
          currentTier={currentTier}
          onSelectTier={handleSelectTier}
          isPurchasing={isPurchasing}
          purchasingTier={purchasingTier}
        />

        {/* Manage Subscription Button */}
        <Pressable
          onPress={() => {
            if (Platform.OS === 'ios') {
              Linking.openURL('https://apps.apple.com/account/subscriptions');
            } else {
              Alert.alert(
                'Manage Subscription',
                'Subscription management is available through the Apple App Store on iOS.',
              );
            }
          }}
          className="mt-2 mb-6 rounded-2xl border border-light-gray bg-white py-4 px-5 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Cancel or manage subscription in App Store"
        >
          <View className="flex-row items-center justify-center mb-1">
            <Ionicons name="settings-outline" size={18} color="#0B1D3A" style={{ marginRight: 8 }} />
            <Text className="text-body font-medium text-navy">
              Cancel or Change Plan
            </Text>
          </View>
          <Text className="text-caption text-navy/50 text-center">
            Opens Apple subscription settings
          </Text>
        </Pressable>

        {/* Footer info */}
        <View className="mt-4 px-2">
          <View className="flex-row items-start mb-2">
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
              style={{ marginTop: 2, marginRight: 6 }}
            />
            <Text className="text-caption text-navy/50 flex-1">
              Subscriptions are billed monthly through the Apple App Store.
              You can cancel anytime from your Apple ID settings.
            </Text>
          </View>
          <View className="flex-row items-start">
            <Ionicons
              name="refresh-outline"
              size={16}
              color="#6B7280"
              style={{ marginTop: 2, marginRight: 6 }}
            />
            <Text className="text-caption text-navy/50 flex-1">
              Your SMS quota resets on your billing anniversary date each month.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
