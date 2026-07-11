/**
 * Shared domain types for Supabase Edge Functions.
 * Mirrors the app's domain types for use in backend logic.
 */

/** Subscription tier levels with corresponding SMS quotas. */
export type SubscriptionTier = "starter" | "growth" | "pro";

/** Monthly SMS quotas per subscription tier. */
export const TIER_QUOTAS: Record<SubscriptionTier, number> = {
  starter: 50,
  growth: 200,
  pro: 1000,
};

/** Status lifecycle for a review request SMS. */
export type ReviewRequestStatus =
  | "sent"
  | "delivered"
  | "rating_received"
  | "feedback_received"
  | "failed"
  | "expired";

/** Conversation state for inbound SMS handling. */
export type ConversationState =
  | "awaiting_rating"
  | "awaiting_feedback_text"
  | "completed"
  | "expired";

/** A single SMS feedback request sent to a customer. */
export interface ReviewRequest {
  id: string;
  businessId: string;
  customerPhone: string;
  customerName?: string;
  serviceType?: string;
  status: ReviewRequestStatus;
  rating?: number;
  sentAt: Date;
  feedbackReceivedAt?: Date;
  createdAt: Date;
}

/** A customer's rating and optional written feedback. */
export interface FeedbackRecord {
  id: string;
  reviewRequestId: string;
  businessId: string;
  rating: number;
  feedbackText?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

/** Business owner profile. */
export interface BusinessProfile {
  id: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  businessName: string;
  business_type?: string;
  email: string;
  googleReviewUrl: string;
  subscriptionTier: SubscriptionTier;
  smsUsedThisPeriod: number;
  billingPeriodStart: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Event types tracked in the audit log. */
export type AuditEventType =
  | "login"
  | "sms_sent"
  | "feedback_received"
  | "feedback_resolved"
  | "record_deleted";

/** A single audit log entry for security and compliance. */
export interface AuditLogEntry {
  id: string;
  actorId: string;
  eventType: AuditEventType;
  resourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/** Active conversation tracking for inbound SMS webhook. */
export interface ActiveConversation {
  id: string;
  reviewRequestId: string;
  businessId: string;
  customerPhone: string;
  customerName?: string;
  googleReviewUrl: string;
  state: ConversationState;
  invalidResponseCount: number;
  createdAt: Date;
}

/** SMS queue entry for retry logic. */
export interface SmsQueueEntry {
  id: string;
  reviewRequestId: string;
  payload: SendSmsPayload;
  retryCount: number;
  status: "pending" | "delivered" | "failed";
  nextRetryAt: Date;
  createdAt: Date;
}

/** Payload for sending an SMS via Twilio. */
export interface SendSmsPayload {
  to: string;
  body: string;
  businessId: string;
  customerName?: string;
}

/** Result type for service operations (mirrors app Result<T>). */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

/** Structured application error. */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/** Error code categories. */
export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
}
