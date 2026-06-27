/**
 * Hook for managing Apple IAP subscription flow.
 *
 * Handles subscription state, purchase initiation via Apple App Store
 * In-App Purchase, and error handling. Currently uses a mock/placeholder
 * for the actual IAP flow that can be swapped for real react-native-iap
 * integration once App Store products are configured.
 *
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { type SubscriptionTier, TIER_QUOTAS } from '@/types';
import type { AppError } from '@/types';

// ─── IAP Product IDs ─────────────────────────────────────────────────────────

/** Apple App Store product IDs mapped to subscription tiers. */
export const IAP_PRODUCT_IDS: Record<SubscriptionTier, string> = {
  starter: 'com.nudgli.starter.monthly',
  growth: 'com.nudgli.growth.monthly',
  pro: 'com.nudgli.pro.monthly',
};

// ─── Tier Pricing Info ───────────────────────────────────────────────────────

export interface TierInfo {
  tier: SubscriptionTier;
  name: string;
  price: string;
  smsLimit: number;
  productId: string;
}

export const TIER_INFO: TierInfo[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$9.99/mo',
    smsLimit: TIER_QUOTAS.starter,
    productId: IAP_PRODUCT_IDS.starter,
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: '$29.99/mo',
    smsLimit: TIER_QUOTAS.growth,
    productId: IAP_PRODUCT_IDS.growth,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$79.99/mo',
    smsLimit: TIER_QUOTAS.pro,
    productId: IAP_PRODUCT_IDS.pro,
  },
];

// ─── Hook Return Type ────────────────────────────────────────────────────────

export interface UseSubscriptionReturn {
  /** Current subscription tier from the business profile. */
  currentTier: SubscriptionTier;
  /** Whether a purchase is currently in progress. */
  isPurchasing: boolean;
  /** Error message from a failed or cancelled purchase. */
  purchaseError: string | null;
  /** Initiate an IAP purchase for the given tier. */
  purchaseTier: (tier: SubscriptionTier) => Promise<void>;
  /** Clear any displayed purchase error. */
  clearError: () => void;
  /** Tier metadata for display purposes. */
  tiers: TierInfo[];
}

// ─── useSubscription Hook ────────────────────────────────────────────────────

export function useSubscription(): UseSubscriptionReturn {
  const { data: profile, refetch: refetchProfile } = useBusinessProfile();
  const businessProfileRepo = useService('businessProfile');

  const currentTier: SubscriptionTier = profile?.subscriptionTier ?? 'starter';
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setPurchaseError(null);
  }, []);

  /**
   * Initiate an Apple IAP purchase for the specified tier.
   *
   * Currently uses a mock/placeholder implementation. In production,
   * this will use react-native-iap to:
   * 1. Request the product from the App Store
   * 2. Present the native purchase sheet
   * 3. Verify the receipt server-side via the appstore-webhook Edge Function
   * 4. Update the subscription tier in the database
   *
   * On failure/cancellation: retains current tier and displays message (Req 8.5).
   */
  const purchaseTier = useCallback(
    async (tier: SubscriptionTier) => {
      if (tier === currentTier) return;

      setIsPurchasing(true);
      setPurchaseError(null);

      try {
        if (Platform.OS !== 'ios') {
          // IAP only works on iOS for this app
          setPurchaseError('In-App Purchases are only available on iOS devices.');
          setIsPurchasing(false);
          return;
        }

        // ─── MOCK IAP FLOW ─────────────────────────────────────────────
        // TODO: Replace with real react-native-iap integration:
        //
        // import { requestPurchase, getProducts } from 'react-native-iap';
        //
        // const productId = IAP_PRODUCT_IDS[tier];
        // const products = await getProducts({ skus: [productId] });
        // if (products.length === 0) throw new Error('Product not found');
        //
        // const purchase = await requestPurchase({ sku: productId });
        // // Server-side verification happens via appstore-webhook
        // // which updates the tier in the database
        //
        // For now, simulate the purchase with a confirmation dialog:
        // ────────────────────────────────────────────────────────────────

        const confirmed = await new Promise<boolean>((resolve) => {
          const tierInfo = TIER_INFO.find((t) => t.tier === tier);
          Alert.alert(
            'Confirm Subscription',
            `Subscribe to ${tierInfo?.name} plan at ${tierInfo?.price}?\n\n` +
              `This includes ${tierInfo?.smsLimit} SMS messages per month.\n\n` +
              '(This is a development placeholder. In production, the Apple App Store purchase sheet will appear here.)',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Subscribe', onPress: () => resolve(true) },
            ],
            { cancelable: false },
          );
        });

        if (!confirmed) {
          // Purchase cancelled by user (Req 8.5): retain current tier
          setPurchaseError('Purchase was cancelled. Your current plan remains unchanged.');
          setIsPurchasing(false);
          return;
        }

        // Simulate updating the tier via the business profile repository.
        // In production, this would be done server-side via the appstore-webhook.
        const result = await businessProfileRepo.updateSubscriptionTier(
          profile?.id ?? '',
          tier,
        );

        if (!result.success) {
          const error = result.error as AppError;
          setPurchaseError(
            error.message || 'Purchase could not be completed. Please try again.',
          );
          setIsPurchasing(false);
          return;
        }

        // Refresh profile to reflect the new tier
        await refetchProfile();
        setIsPurchasing(false);
      } catch (error) {
        // Purchase failed (Req 8.5): retain current tier, display message
        setPurchaseError(
          'Purchase was not completed. Your current plan remains unchanged.',
        );
        setIsPurchasing(false);
      }
    },
    [currentTier, profile?.id, businessProfileRepo, refetchProfile],
  );

  return {
    currentTier,
    isPurchasing,
    purchaseError,
    purchaseTier,
    clearError,
    tiers: TIER_INFO,
  };
}
