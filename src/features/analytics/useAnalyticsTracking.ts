/**
 * Centralized analytics tracking module.
 *
 * Provides:
 * - useScreenTracking(): A hook that tracks screen views on route changes via Expo Router's usePathname.
 * - Named helper functions for tracking key app events (review_request_sent, feedback_received,
 *   customer_called, feedback_resolved, subscription_tier_changed).
 *
 * Components/hooks can import and call these helpers at the appropriate moments.
 * The analytics service is resolved via the useService('analytics') hook for the screen
 * tracking hook, and via a getAnalyticsService() getter for imperative event helpers.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';

import { useService } from '@/services';
import type { IAnalyticsService } from '@/services/interfaces/analytics.service';

// ─── Imperative Service Access ───────────────────────────────────────────────

/**
 * Module-level reference for imperative (non-hook) analytics calls.
 * Set by calling `setAnalyticsService()` during app initialization.
 */
let analyticsServiceInstance: IAnalyticsService | null = null;

/**
 * Registers the analytics service instance for use by imperative helper functions.
 * Should be called once during app startup (e.g., in the root layout).
 */
export function setAnalyticsService(service: IAnalyticsService): void {
  analyticsServiceInstance = service;
}

/**
 * Returns the registered analytics service, or null if not yet initialized.
 */
export function getAnalyticsService(): IAnalyticsService | null {
  return analyticsServiceInstance;
}

// ─── Screen Tracking Hook ────────────────────────────────────────────────────

/**
 * Tracks screen views whenever the Expo Router pathname changes.
 * Place this hook in a layout component that renders on every route (e.g., root layout).
 *
 * Uses Expo Router's `usePathname()` to detect navigation and calls
 * `analyticsService.trackScreenView(screenName)` on each change.
 */
export function useScreenTracking(): void {
  const analytics = useService('analytics');
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      analytics.trackScreenView(pathname);
    }
  }, [pathname, analytics]);
}

// ─── Event Tracking Helpers ──────────────────────────────────────────────────

/**
 * Tracks a 'review_request_sent' event when an SMS review request is successfully sent.
 *
 * @param properties - Optional properties such as phoneNumber (last 4 digits), customerName presence, serviceType presence.
 */
export function trackReviewRequestSent(properties?: Record<string, unknown>): void {
  const service = getAnalyticsService();
  if (!service) return;

  service.trackEvent({
    name: 'review_request_sent',
    properties,
  });
}

/**
 * Tracks a 'feedback_received' event when new customer feedback arrives.
 *
 * @param properties - Optional properties such as rating value, has_text indicator.
 */
export function trackFeedbackReceived(properties?: Record<string, unknown>): void {
  const service = getAnalyticsService();
  if (!service) return;

  service.trackEvent({
    name: 'feedback_received',
    properties,
  });
}

/**
 * Tracks a 'customer_called' event when the business owner taps "Call Customer" in the inbox.
 *
 * @param properties - Optional properties such as feedback_id.
 */
export function trackCustomerCalled(properties?: Record<string, unknown>): void {
  const service = getAnalyticsService();
  if (!service) return;

  service.trackEvent({
    name: 'customer_called',
    properties,
  });
}

/**
 * Tracks a 'feedback_resolved' event when the business owner taps "Mark Resolved".
 *
 * @param properties - Optional properties such as feedback_id, rating.
 */
export function trackFeedbackResolved(properties?: Record<string, unknown>): void {
  const service = getAnalyticsService();
  if (!service) return;

  service.trackEvent({
    name: 'feedback_resolved',
    properties,
  });
}

/**
 * Tracks a 'subscription_tier_changed' event when an IAP purchase succeeds.
 *
 * @param properties - Optional properties such as previous_tier, new_tier.
 */
export function trackSubscriptionTierChanged(properties?: Record<string, unknown>): void {
  const service = getAnalyticsService();
  if (!service) return;

  service.trackEvent({
    name: 'subscription_tier_changed',
    properties,
  });
}
