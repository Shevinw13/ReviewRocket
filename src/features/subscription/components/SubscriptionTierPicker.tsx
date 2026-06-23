/**
 * SubscriptionTierPicker component.
 *
 * Displays three subscription tier cards (Starter, Growth, Pro) with
 * pricing, SMS limits, and a "Subscribe" button on non-current tiers.
 * The current tier is highlighted with distinct styling.
 *
 * Requirements: 8.1, 8.4, 8.5
 */

import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { type SubscriptionTier } from '@/types';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { TIER_INFO, type TierInfo } from '@/features/subscription/hooks/useSubscription';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SubscriptionTierPickerProps {
  /** The user's current subscription tier. */
  currentTier: SubscriptionTier;
  /** Called when the user taps "Subscribe" on a non-current tier. */
  onSelectTier: (tier: SubscriptionTier) => void;
  /** Whether a purchase is currently in progress. */
  isPurchasing?: boolean;
  /** The tier being purchased (for loading state). */
  purchasingTier?: SubscriptionTier | null;
}

// ─── Tier Card Component ─────────────────────────────────────────────────────

interface TierCardProps {
  tierInfo: TierInfo;
  isCurrent: boolean;
  onSelect: () => void;
  isPurchasing: boolean;
  isThisTierPurchasing: boolean;
}

function TierCard({
  tierInfo,
  isCurrent,
  onSelect,
  isPurchasing,
  isThisTierPurchasing,
}: TierCardProps) {
  const { name, price, smsLimit } = tierInfo;

  return (
    <View
      className={`rounded-2xl border p-5 mb-4 ${
        isCurrent
          ? 'border-rocket-orange bg-rocket-orange/5'
          : 'border-light-gray bg-white'
      }`}
      accessibilityRole="summary"
      accessibilityLabel={`${name} plan, ${price}, ${smsLimit} SMS per month${isCurrent ? ', current plan' : ''}`}
    >
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text
            className={`text-body font-bold ${
              isCurrent ? 'text-rocket-orange' : 'text-navy'
            }`}
          >
            {name}
          </Text>
          {isCurrent && (
            <View className="ml-2 bg-rocket-orange/10 px-2 py-0.5 rounded-full">
              <Text className="text-caption font-semibold text-rocket-orange">
                Current
              </Text>
            </View>
          )}
        </View>
        <Text className="text-body font-bold text-navy">{price}</Text>
      </View>

      {/* SMS Limit */}
      <View className="flex-row items-center mb-4">
        <Ionicons
          name="chatbubble-outline"
          size={16}
          color={isCurrent ? '#FF6B35' : '#6B7280'}
        />
        <Text
          className={`text-caption ml-2 ${
            isCurrent ? 'text-rocket-orange/80' : 'text-navy/60'
          }`}
        >
          {smsLimit.toLocaleString()} SMS messages per month
        </Text>
      </View>

      {/* Action Button */}
      {isCurrent ? (
        <View className="bg-rocket-orange/10 rounded-xl py-3 items-center">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={18} color="#FF6B35" />
            <Text className="text-caption font-semibold text-rocket-orange ml-1.5">
              Your Current Plan
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onSelect}
          disabled={isPurchasing}
          className={`rounded-xl py-3 items-center ${
            isPurchasing ? 'bg-rocket-orange/50' : 'bg-rocket-orange active:bg-rocket-orange/80'
          }`}
          accessibilityRole="button"
          accessibilityLabel={`Subscribe to ${name} plan`}
          accessibilityState={{ disabled: isPurchasing }}
        >
          {isThisTierPurchasing ? (
            <LoadingIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-caption font-bold text-white">Subscribe</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── SubscriptionTierPicker ──────────────────────────────────────────────────

export function SubscriptionTierPicker({
  currentTier,
  onSelectTier,
  isPurchasing = false,
  purchasingTier = null,
}: SubscriptionTierPickerProps) {
  return (
    <View>
      {TIER_INFO.map((tierInfo) => (
        <TierCard
          key={tierInfo.tier}
          tierInfo={tierInfo}
          isCurrent={tierInfo.tier === currentTier}
          onSelect={() => onSelectTier(tierInfo.tier)}
          isPurchasing={isPurchasing}
          isThisTierPurchasing={purchasingTier === tierInfo.tier}
        />
      ))}
    </View>
  );
}
