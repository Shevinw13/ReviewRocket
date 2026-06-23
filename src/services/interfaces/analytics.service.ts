/**
 * Analytics service interface.
 * Abstracts event tracking so business logic is decoupled from PostHog.
 */

/** Analytics event payload. */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

export interface IAnalyticsService {
  trackEvent(event: AnalyticsEvent): void;
  trackScreenView(screenName: string): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
  reset(): void;
}
