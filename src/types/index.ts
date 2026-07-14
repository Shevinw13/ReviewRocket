/**
 * Barrel export for all shared types.
 */

// Result type and error handling
export { type Result, type AppError, ErrorCode } from './result';

// Domain models
export {
  type BusinessType,
  type SubscriptionTier,
  TIER_QUOTAS,
  TRIAL_SMS_LIMIT,
  type BusinessProfile,
  type ReviewRequestStatus,
  type ReviewRequest,
  type FeedbackRecord,
  type AuditEventType,
  type AuditLogEntry,
  type DashboardMetrics,
  type ActivityItem,
  type InboxItem,
} from './domain';

// API request/response DTOs
export {
  type SignUpParams,
  type SignInParams,
  type AuthUser,
  type AuthSession,
  type Unsubscribe,
  type CreateReviewRequestDTO,
  type SendSmsParams,
  type SmsDeliveryResult,
  type CreateFeedbackDTO,
  type NotificationPermissionStatus,
  type AppNotification,
  type UpdateSubscriptionParams,
} from './api';

// Zod validation schemas and inferred types
export {
  signUpSchema,
  sendRequestSchema,
  ratingSchema,
  feedbackTextSchema,
  type SignUpFormData,
  type SendRequestFormData,
} from './schemas';
