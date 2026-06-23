# Implementation Plan: Review Rocket MVP

## Overview

This plan implements the Review Rocket iOS app from project scaffolding through monitoring setup. The architecture follows clean separation with service interfaces, repository pattern, and infrastructure adapters using React Native, Expo, TypeScript, Supabase, and Twilio.

## Tasks

- [x] 1. Project scaffolding, theme, and core types
  - [x] 1.1 Initialize Expo project with TypeScript and install dependencies
    - Create Expo app with TypeScript template
    - Install: expo-router, @tanstack/react-query, nativewind, react-hook-form, @hookform/resolvers, zod, @supabase/supabase-js, @sentry/react-native, posthog-react-native, expo-notifications
    - Configure NativeWind with tailwind.config.js
    - Set up path aliases in tsconfig.json
    - _Requirements: 13.3_

  - [x] 1.2 Define theme configuration (colors, spacing, typography)
    - Create `src/theme/colors.ts` with Navy (#0B1736), Rocket Orange (#FF6B35), Success Green (#22C55E), White (#FFFFFF), Card Background (#F8FAFC), Light Gray (#E5E7EB)
    - Create `src/theme/spacing.ts` with consistent spacing scale
    - Create `src/theme/typography.ts` with 3 distinct font sizes (headings, body, captions) min 4pt difference
    - Configure tailwind.config.js to use theme tokens
    - _Requirements: 12.1, 12.2, 12.5_

  - [x] 1.3 Create domain types, Result type, and error codes
    - Create `src/types/result.ts` with Result<T> union type and AppError interface
    - Create `src/types/domain.ts` with BusinessProfile, ReviewRequest, FeedbackRecord, AuditLogEntry, DashboardMetrics, ActivityItem, SubscriptionTier, TIER_QUOTAS
    - Create `src/types/api.ts` with API request/response DTOs
    - Create ErrorCode enum with all error categories
    - _Requirements: 13.6_

  - [x] 1.4 Create Zod validation schemas
    - Create `src/types/schemas.ts` with signUpSchema (firstName, lastName, businessName, email, password, googleReviewUrl validations)
    - Create sendRequestSchema with US phone number regex, optional customerName (max 50), optional serviceType (max 50)
    - Create ratingSchema and feedbackTextSchema
    - Export inferred TypeScript types from schemas
    - _Requirements: 1.2, 1.4, 1.5, 3.2, 3.3_

  - [x]* 1.5 Write property tests for signup schema validation
    - **Property 1: Signup schema validation**
    - Use fast-check to generate valid/invalid combinations of all fields
    - Verify schema accepts iff all constraints are met
    - **Validates: Requirements 1.2, 1.4, 1.5**

  - [x]* 1.6 Write property tests for send request schema validation
    - **Property 2: Send request schema validation**
    - Use fast-check to generate phone numbers, customer names, service types
    - Verify schema accepts valid US 10-digit numbers with/without formatting
    - **Validates: Requirements 3.2, 3.3**

  - [x] 1.7 Create service interface definitions
    - Create `src/services/interfaces/auth.service.ts` with IAuthService interface
    - Create `src/services/interfaces/database.service.ts` with IReviewRequestRepository, IFeedbackRepository, IBusinessProfileRepository
    - Create `src/services/interfaces/sms.service.ts` with ISmsService interface
    - Create `src/services/interfaces/notification.service.ts` with INotificationService interface
    - Create `src/services/interfaces/monitoring.service.ts` with IMonitoringService interface
    - Create `src/services/interfaces/analytics.service.ts` with IAnalyticsService interface
    - Create `src/services/index.ts` service registry with useService hook
    - _Requirements: 13.1, 13.2, 13.6_

- [x] 2. Supabase backend setup and database schema
  - [x] 2.1 Set up Supabase project and database migrations
    - Initialize Supabase project locally with `supabase init`
    - Create migration for business_owners table with all columns (id, auth_user_id, first_name, last_name, business_name, email, google_review_url, subscription_tier, sms_used_this_period, billing_period_start, created_at, updated_at)
    - Create migration for review_requests table with encrypted fields
    - Create migration for feedback_records table with encrypted fields
    - Create migration for audit_log table
    - Create migration for device_tokens table
    - Create migration for sms_queue table
    - _Requirements: 10.1, 10.4_

  - [x] 2.2 Configure Row Level Security policies and indexes
    - Enable RLS on business_owners, review_requests, feedback_records tables
    - Create policy: users can only access own business_owners row (auth_user_id = auth.uid())
    - Create policy: users can only access review_requests where business_id matches their business
    - Create policy: users can only access feedback_records where business_id matches their business
    - Create indexes for common queries (business_id + sent_at, phone + sent_at, business_id + is_resolved + created_at, actor_id + created_at)
    - _Requirements: 10.3_

  - [x] 2.3 Set up Supabase Edge Function shared utilities
    - Create `supabase/functions/_shared/services/interfaces/` mirroring app service interfaces
    - Create `supabase/functions/_shared/adapters/supabase.adapter.ts` for database operations
    - Create `supabase/functions/_shared/adapters/twilio.adapter.ts` for SMS operations
    - Create `supabase/functions/_shared/types/` with shared domain types
    - Create `supabase/functions/_shared/utils/` with encryption utilities (AES-256-GCM)
    - Implement data sanitization utility to strip customerPhone, customerName, feedbackText from log contexts
    - _Requirements: 10.1, 10.5, 13.4_

  - [x]* 2.4 Write property test for data sanitization
    - **Property 12: Data sanitization**
    - Use fast-check to generate objects with various field combinations
    - Verify sensitive fields (customerPhone, customerName, feedbackText) are removed/redacted
    - Verify all other fields are preserved unchanged
    - **Validates: Requirements 10.5, 14.1, 14.3**

- [x] 3. Authentication implementation
  - [x] 3.1 Implement Supabase auth adapter
    - Create `src/infrastructure/supabase/client.ts` with Supabase client initialization (env vars for URL and anon key)
    - Create `src/infrastructure/supabase/auth.adapter.ts` implementing IAuthService
    - Implement signUp with email/password + user metadata (firstName, lastName, businessName, googleReviewUrl)
    - Implement signIn returning JWT access token (1h) and refresh token (7d)
    - Implement signOut invalidating session tokens
    - Implement refreshSession with token rotation
    - Implement requestPasswordReset sending single-use link (60min expiry)
    - Implement onAuthStateChange for session state subscription
    - _Requirements: 2.1, 2.3, 2.4, 2.6, 2.7_

  - [x] 3.2 Build signup screen with form validation
    - Create `src/app/(auth)/signup.tsx` with React Hook Form + Zod signUpSchema
    - Implement fields: First Name, Last Name, Business Name, Email, Password, Google Review URL
    - Display inline validation errors per field
    - On successful submission, navigate to email verification confirmation screen
    - Preserve form data on network/server error so user can retry without re-entering
    - Create `src/app/(auth)/verify-email.tsx` confirmation screen
    - _Requirements: 1.1, 1.3, 1.5, 1.6, 1.7_

  - [x] 3.3 Build login screen with error handling
    - Create `src/app/(auth)/login.tsx` with email and password fields
    - Display generic error for invalid credentials (not revealing which field is wrong)
    - Handle rate limit (5 failed attempts / 15 min) showing lockout duration
    - Handle unverified email error with appropriate message
    - Implement "Forgot Password" link triggering requestPasswordReset
    - _Requirements: 2.2, 2.5, 2.9, 2.6_

  - [x] 3.4 Implement auth state management and route guards
    - Create `src/app/_layout.tsx` root layout with auth guard
    - Implement auto-refresh logic: when access token expires, use refresh token
    - Handle refresh token expiry: terminate session, redirect to login
    - Implement logout clearing tokens and navigating to login screen
    - Configure React Query auth header injection via Supabase client
    - _Requirements: 2.3, 2.4, 2.7, 2.8, 9.3_

  - [x]* 3.5 Write unit tests for auth adapter and auth screens
    - Test signUp success and error flows
    - Test signIn with valid/invalid credentials
    - Test token refresh and session expiry handling
    - Test form validation display on signup and login screens
    - _Requirements: 1.1, 2.1, 2.2, 2.5_

- [x] 4. Checkpoint - Verify auth flow
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Navigation and app structure
  - [x] 5.1 Set up Expo Router tab navigation
    - Create `src/app/(tabs)/_layout.tsx` with bottom tab navigator (Home, Inbox, Settings)
    - Configure labeled icons for each tab with active state highlighting
    - Implement tab state preservation (scroll position and nested screen stack)
    - Set Dashboard as default screen for authenticated users
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 5.2 Implement Inbox tab badge with unresolved count
    - Create hook to fetch unresolved feedback count via IFeedbackRepository.getUnresolvedCount
    - Display numeric badge on Inbox tab
    - Set up polling or realtime subscription to update badge within 5 seconds of new feedback
    - _Requirements: 9.5_

- [x] 6. Shared UI components
  - [x] 6.1 Create reusable UI primitives
    - Create `src/components/ui/Button.tsx` with loading state, disabled state, color variants (primary=Rocket Orange, secondary)
    - Create `src/components/ui/Card.tsx` with consistent shadow and border radius
    - Create `src/components/ui/Input.tsx` with label, error message display, and accessibility props
    - Create `src/components/ui/Badge.tsx` for numeric badges
    - Create `src/components/ui/LoadingIndicator.tsx` appearing within 200ms of action start
    - Create `src/components/ui/SuccessIndicator.tsx` using Success Green, visible for 2 seconds
    - Create `src/components/ui/ErrorIndicator.tsx` remaining until user dismisses or retries
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 6.2 Create ErrorBoundary component
    - Create `src/components/ErrorBoundary.tsx` wrapping each tab screen
    - On unhandled exception: capture to Sentry with screen name, device info, anonymized user ID
    - Render friendly error screen with "Restart" button navigating back to Dashboard
    - Ensure app does not crash on unhandled exceptions
    - _Requirements: 11.5, 14.1_

- [x] 7. Utility functions
  - [x] 7.1 Implement phone number formatting and validation utilities
    - Create `src/utils/phone.ts` with formatPhoneNumber (output: (XXX) XXX-XXXX) and normalizePhoneNumber (strip to 10 digits)
    - Create `src/utils/date.ts` with date comparison utilities and month boundary calculations
    - _Requirements: 3.2_

  - [x] 7.2 Implement metrics calculation utilities
    - Create `src/utils/metrics.ts` with calculateMonthOverMonth function returning null if previousCount is 0, otherwise rounded percentage
    - Create sortAndLimitActivity function returning top 10 items sorted newest first
    - Create filterUnresolvedFeedback function returning items where rating ≤ 3 AND isResolved is false, sorted by createdAt descending
    - _Requirements: 5.3, 5.6, 6.1_

  - [x]* 7.3 Write property test for month-over-month calculation
    - **Property 8: Month-over-month percentage calculation**
    - Use fast-check to generate non-negative integer pairs
    - Verify returns null when previousCount is 0
    - Verify returns round((current - previous) / previous * 100) otherwise
    - **Validates: Requirements 5.3**

  - [x]* 7.4 Write property test for activity feed sort and limit
    - **Property 9: Activity feed sort and limit**
    - Use fast-check to generate lists of activity items with timestamps
    - Verify output has at most 10 items sorted by timestamp descending
    - **Validates: Requirements 5.6**

  - [x]* 7.5 Write property test for inbox filtering and sorting
    - **Property 10: Inbox filtering and sorting**
    - Use fast-check to generate feedback records with varying ratings and resolved states
    - Verify only records with rating ≤ 3 AND isResolved=false are returned, sorted descending
    - **Validates: Requirements 6.1**

  - [x]* 7.6 Write property test for SMS quota state classification
    - **Property 11: SMS quota state classification**
    - Use fast-check to generate (used, quota) pairs where quota > 0
    - Verify "exceeded" if used ≥ quota, "warning" if used ≥ 0.8*quota, "ok" otherwise
    - **Validates: Requirements 7.3, 8.3**

  - [x] 7.7 Implement retry utility with exponential backoff
    - Create `src/utils/retry.ts` with withRetry<T> function
    - Implement exponential backoff: 1s, 2s, 4s (baseDelay * 2^attempt)
    - Max 3 attempts before returning error Result
    - _Requirements: 11.4_

  - [x]* 7.8 Write property test for exponential backoff calculation
    - **Property 14: Exponential backoff calculation**
    - Use fast-check to verify delay = 1000 × 2^n for n in {0, 1, 2}
    - **Validates: Requirements 11.4**

- [x] 8. Supabase repository adapters
  - [x] 8.1 Implement BusinessProfile repository adapter
    - Create `src/infrastructure/supabase/repositories/business-profile.repository.ts` implementing IBusinessProfileRepository
    - Implement getByOwnerId, updateSubscriptionTier, incrementSmsUsage, resetSmsUsage, getSmsUsage
    - Include audit log writes for relevant operations
    - _Requirements: 8.2, 8.6, 10.4, 13.2_

  - [x] 8.2 Implement ReviewRequest repository adapter
    - Create `src/infrastructure/supabase/repositories/review-request.repository.ts` implementing IReviewRequestRepository
    - Implement create, findByPhoneNumberWithin24Hours, getRecentByBusiness, getMonthlyCount, getPreviousMonthCount, updateWithRating
    - Handle encrypted field storage/retrieval via Edge Function calls
    - _Requirements: 3.4, 3.7, 5.2, 5.3, 10.1, 13.2_

  - [x] 8.3 Implement FeedbackRecord repository adapter
    - Create `src/infrastructure/supabase/repositories/feedback-record.repository.ts` implementing IFeedbackRepository
    - Implement create, getUnresolved, getAll, markResolved, updateFeedbackText, getUnresolvedCount
    - markResolved sets is_resolved=true and resolved_at=current timestamp
    - Write audit log entry on resolve action
    - _Requirements: 6.1, 6.4, 6.6, 10.4, 13.2_

- [x] 9. Send Review Request feature
  - [x] 9.1 Implement send-sms Edge Function
    - Create `supabase/functions/send-sms/index.ts`
    - Accept authenticated request with phoneNumber, customerName, serviceType, businessId
    - Validate SMS quota (return QUOTA_EXCEEDED if used ≥ quota)
    - Check duplicate send within 24 hours, return warning flag if found
    - Format SMS message: "Hi [Customer Name], Thank you for choosing [Business Name]..." (omit greeting if no name)
    - Call Twilio API to send SMS
    - Create review_request record in database
    - Increment sms_used_this_period
    - Write audit log entry for sms_sent event
    - On Twilio failure: write to sms_queue for retry
    - _Requirements: 3.1, 3.4, 3.7, 4.1, 4.2, 8.3, 10.4, 11.6_

  - [x]* 9.2 Write property test for SMS message formatting
    - **Property 3: SMS message formatting**
    - Use fast-check to generate business names and optional customer names
    - Verify message contains business name and 1-5 rating instruction
    - Verify "Hi [Name]" present iff customer name provided
    - **Validates: Requirements 4.1, 4.2**

  - [x] 9.3 Build Send Request screen
    - Create `src/app/send-request.tsx` with React Hook Form + sendRequestSchema
    - Phone number input with (XXX) XXX-XXXX auto-formatting
    - Optional Customer Name field (max 50 chars)
    - Optional Service Type field (max 50 chars)
    - Display sender phone number "(833) 123-4567" as informational text
    - Send Text button disabled until valid phone number entered
    - Loading indicator and button disabled while sending
    - On success: show confirmation with phone, name, service type; reset form
    - On duplicate within 24h: show warning dialog requiring confirmation
    - On quota exceeded: navigate to subscription tier selection
    - On error: display error message, allow retry
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 8.3_

  - [x] 9.4 Implement form cache for offline resilience
    - Create `src/infrastructure/cache/form-cache.ts` using AsyncStorage
    - Cache unsent form data locally, surviving app closure or network interruption
    - Retain cached data for up to 30 days, store maximum 50 pending requests
    - Evict entries older than 30 days on each write operation
    - _Requirements: 11.3_

  - [x]* 9.5 Write property test for form cache management
    - **Property 13: Form cache management**
    - Use fast-check to generate sequences of cache write operations
    - Verify cache never exceeds 50 pending requests
    - Verify requests older than 30 days are excluded
    - **Validates: Requirements 11.3**

  - [x] 9.6 Create useSendReviewRequest React Query hook
    - Create `src/features/send-request/hooks/useSendReviewRequest.ts`
    - Call send-sms Edge Function via ISmsService
    - On success: invalidate dashboard-metrics and recent-activity queries
    - Implement withRetry wrapper for network resilience
    - _Requirements: 3.1, 3.5, 11.4_

- [x] 10. Checkpoint - Verify send request flow
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Twilio webhook and SMS conversation handling
  - [x] 11.1 Implement twilio-webhook Edge Function
    - Create `supabase/functions/twilio-webhook/index.ts`
    - Parse Twilio webhook payload (From, Body)
    - Look up active conversation by customer phone number
    - Check 72-hour expiry: if expired, return empty TwiML response
    - If awaiting_rating state: parse rating (1-5) from body
    - On valid rating 4-5: respond with Google Review URL message, record rating, create feedback record
    - On valid rating 1-3: respond with negative feedback prompt, record rating, create feedback record, trigger push notification
    - On invalid response: increment invalid count, send retry prompt
    - On 2 consecutive invalid responses: send final "conversation ended" message, stop responding
    - If awaiting_feedback_text state: store first 500 chars of body, send thank you, trigger push notification
    - Write audit log entry for feedback_received events
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 10.4_

  - [x]* 11.2 Write property test for rating response routing
    - **Property 4: Rating response routing**
    - Use fast-check to generate valid ratings (1-5) and Google Review URLs
    - Verify response contains Google Review URL iff rating is 4 or 5
    - Verify response contains negative feedback prompt iff rating is 1, 2, or 3
    - **Validates: Requirements 4.3, 4.4**

  - [x]* 11.3 Write property test for feedback text truncation
    - **Property 5: Feedback text truncation**
    - Use fast-check to generate strings of varying length
    - Verify stored text equals input if ≤500 chars, equals first 500 chars if >500
    - **Validates: Requirements 4.5, 4.6**

  - [x]* 11.4 Write property test for invalid rating detection
    - **Property 6: Invalid rating detection**
    - Use fast-check to generate strings that are not exactly "1"-"5"
    - Verify parser classifies them as invalid
    - **Validates: Requirements 4.7**

  - [x]* 11.5 Write property test for conversation expiry check
    - **Property 7: Conversation expiry check**
    - Use fast-check to generate sent and reply timestamps
    - Verify returns expired=true iff reply is >72 hours after sent
    - **Validates: Requirements 4.10**

  - [x] 11.6 Implement SMS queue retry Edge Function
    - Create scheduled function that runs every 5 minutes
    - Pick up items from sms_queue with status=pending and next_retry_at ≤ now
    - Retry sending via Twilio adapter
    - On success: mark as delivered, update review_request status
    - On failure: increment retry_count, set next_retry_at = now + 5 minutes
    - After 24 hours (creation_time + 24h exceeded): mark as failed, send push notification to business owner
    - _Requirements: 11.6_

  - [x]* 11.7 Write property test for SMS queue retry eligibility
    - **Property 15: SMS queue retry eligibility**
    - Use fast-check to generate creation timestamps and current time
    - Verify eligible for retry iff <24 hours elapsed
    - Verify next retry scheduled exactly 5 minutes after previous attempt
    - **Validates: Requirements 11.6**

- [x] 12. Dashboard feature
  - [x] 12.1 Build Dashboard screen with metrics
    - Create `src/app/(tabs)/index.tsx` as Dashboard screen
    - Display greeting with Business Name
    - Create DashboardMetrics component showing: Review Opportunities Created (monthly), month-over-month % change (or N/A), Positive Responses (4-5), Needs Attention (1-3), Requests Sent
    - Display "Send Review Request" CTA button navigating to send-request screen
    - Implement pull-to-refresh updating all metrics with loading indicator and 10-second timeout
    - Show empty state (zeros, no activity message) when no data exists for current month
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8_

  - [x] 12.2 Build Recent Activity Feed component
    - Create `src/components/feedback/RecentActivityFeed.tsx`
    - Display 10 most recent customer ratings with customer name and rating value
    - Sort newest to oldest
    - Show empty state message when no activity exists
    - _Requirements: 5.6, 5.8_

  - [x] 12.3 Create Dashboard React Query hooks
    - Create `src/features/dashboard/hooks/useDashboardMetrics.ts` fetching monthly counts
    - Create `src/features/dashboard/hooks/useRecentActivity.ts` fetching last 10 ratings
    - Calculate month-over-month using utility function
    - Configure appropriate staleTime and refetchOnWindowFocus
    - _Requirements: 5.2, 5.3, 5.6_

- [x] 13. Feedback Inbox feature
  - [x] 13.1 Build Inbox screen with feedback cards
    - Create `src/app/(tabs)/inbox.tsx` with tab filters: "Needs Attention" (unresolved) and "All Feedback" (including resolved)
    - "Needs Attention" tab displays badge with unresolved count
    - Default to "Needs Attention" view
    - Show feedback cards sorted by most recent date first
    - Each FeedbackCard shows: Customer Name, Rating, Feedback Text (if provided), date received
    - Omit Feedback Text section if no written feedback provided
    - Show empty state when no unresolved feedback exists
    - _Requirements: 6.1, 6.2, 6.6, 6.7_

  - [x] 13.2 Implement Inbox action handlers
    - "Call Customer" button: initiate phone call via device dialer (Linking.openURL)
    - "Mark Resolved" button: call IFeedbackRepository.markResolved, remove card from Needs Attention view
    - Handle markResolved failure: display error, retain card in current state
    - Invalidate inbox queries and badge count on successful resolve
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 13.3 Create Inbox React Query hooks
    - Create `src/features/inbox/hooks/useUnresolvedFeedback.ts`
    - Create `src/features/inbox/hooks/useAllFeedback.ts`
    - Create `src/features/inbox/hooks/useMarkResolved.ts` mutation with optimistic update
    - _Requirements: 6.1, 6.4, 6.6_

- [x] 14. Checkpoint - Verify core app screens
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Push notifications
  - [x] 15.1 Implement push notification adapter
    - Create `src/infrastructure/notifications/notification.adapter.ts` implementing INotificationService
    - Implement registerDevice: save expo push token to device_tokens table
    - Implement requestPermission and getPermissionStatus using expo-notifications
    - Implement onNotificationReceived callback registration
    - Handle notification tap: if authenticated, navigate to relevant inbox item; if not, show login then navigate
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 15.2 Implement notification permission prompt
    - Create in-app prompt explaining value of notifications when permission not granted
    - Provide button to open device notification settings
    - Show prompt on first authenticated app launch if permission not granted
    - _Requirements: 7.6_

  - [x] 15.3 Implement push notification triggers in Edge Functions
    - In twilio-webhook: trigger push notification on rating 1-3 with customer name and rating value
    - In twilio-webhook: trigger push notification on written feedback received
    - In send-sms: check if usage reaches 80% of quota, trigger quota warning notification
    - In SMS queue retry: trigger notification on final failure after 24h
    - All notifications sent within 60 seconds of triggering event
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 16. Subscription and usage management
  - [x] 16.1 Build Settings screen with usage display
    - Create `src/app/(tabs)/settings.tsx`
    - Display current SMS usage count and remaining quota, refreshed on screen open
    - Display current subscription tier
    - Add logout button triggering IAuthService.signOut
    - Add account section showing business info
    - _Requirements: 8.2, 2.7_

  - [x] 16.2 Implement Apple IAP subscription flow
    - Create `src/features/subscription/hooks/useSubscription.ts`
    - Create SubscriptionTierPicker component showing Starter (250/mo), Growth (1000/mo), Pro (5000/mo)
    - Implement Apple App Store In-App Purchase flow via expo-in-app-purchases or react-native-iap
    - On purchase failure/cancellation: retain current tier, display message
    - Navigate to subscription screen when quota exceeded on send request
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [x] 16.3 Implement App Store webhook Edge Function
    - Create `supabase/functions/appstore-webhook/index.ts`
    - Handle App Store server notifications for subscription purchase confirmation
    - Update business_owner subscription_tier and sms_quota within 10 seconds of confirmation
    - Handle subscription renewal and billing period reset
    - _Requirements: 8.6, 8.7_

- [x] 17. Monitoring and analytics
  - [x] 17.1 Implement Sentry monitoring adapter
    - Create `src/infrastructure/sentry/sentry.adapter.ts` implementing IMonitoringService
    - Initialize Sentry with DSN from environment config
    - Implement captureException with context: screen name, anonymized user ID, device model, OS version, network status
    - Implement setUser/clearUser for session tracking
    - Implement addBreadcrumb for navigation and action tracking
    - Exclude sensitive data (customerPhone, customerName, feedbackText) from all error reports
    - Include app version and build number in all reports
    - _Requirements: 14.1, 14.4_

  - [x] 17.2 Implement PostHog analytics adapter
    - Create `src/infrastructure/posthog/posthog.adapter.ts` implementing IAnalyticsService
    - Initialize PostHog with API key from environment config
    - Implement trackEvent for: review_request_sent, feedback_received, customer_called, feedback_resolved, subscription_tier_changed
    - Implement trackScreenView for all screen navigations
    - Implement identify with anonymized user ID and traits
    - Include app version and build number in all events
    - _Requirements: 14.2, 14.4_

  - [x] 17.3 Implement event buffer for offline resilience
    - Create `src/infrastructure/monitoring/event-buffer.ts`
    - Buffer up to 100 unsent events locally when Sentry/PostHog is unreachable
    - Drop oldest events when capacity exceeded
    - Retry transmission when connectivity to monitoring service is restored
    - _Requirements: 14.5_

  - [x]* 17.4 Write property test for event buffer management
    - **Property 16: Event buffer management**
    - Use fast-check to generate sequences of events when service is unreachable
    - Verify buffer stores at most 100 events
    - Verify oldest events are dropped when capacity exceeded
    - **Validates: Requirements 14.5**

  - [x] 17.5 Implement Edge Function error logging
    - Add structured error logging to all Edge Functions
    - Log: severity level, request ID, timestamp, function name, sanitized request parameters
    - Exclude customer phone numbers, customer names, and feedback text from logs
    - Log on: unhandled exceptions, HTTP 5xx responses, Twilio/DB connection failures
    - _Requirements: 14.3_

- [x] 18. Data security and audit logging
  - [x] 18.1 Implement encryption utilities for sensitive data
    - Create encryption module in Edge Functions using AES-256-GCM
    - Encryption key stored in Supabase Vault (environment secret)
    - Encrypt customer_phone, customer_name, feedback_text before database storage
    - Decrypt in Edge Functions only for authorized requests passing RLS
    - Mobile app never handles raw encryption keys
    - _Requirements: 10.1, 10.6_

  - [x] 18.2 Implement audit logging service
    - Create audit log write utility in Edge Functions
    - Log events: login, sms_sent, feedback_received, feedback_resolved, record_deleted
    - Each entry: timestamp, actor identifier, event type, affected resource identifier
    - Integrate audit writes into all relevant Edge Function operations
    - _Requirements: 10.4_

  - [x] 18.3 Implement customer record deletion
    - Create Edge Function or RPC for customer record deletion
    - Remove customer phone number, name, and feedback text within 30 days of request
    - Log deletion event in audit log
    - Add delete action to Settings or feedback card context
    - _Requirements: 10.7_

- [x] 19. Integration wiring and analytics event tracking
  - [x] 19.1 Wire analytics tracking events throughout app
    - Track screen views on all route navigations via Expo Router listener
    - Track review_request_sent on successful send
    - Track feedback_received when new feedback arrives
    - Track customer_called when "Call Customer" tapped
    - Track feedback_resolved when "Mark Resolved" tapped
    - Track subscription_tier_changed on successful IAP
    - _Requirements: 14.2_

  - [x] 19.2 Wire ErrorBoundary and Sentry throughout app
    - Wrap each tab screen with ErrorBoundary component
    - Connect Sentry to navigation state for automatic screen name context
    - Set Sentry user on auth state change, clear on logout
    - Add breadcrumbs for key user actions
    - _Requirements: 11.5, 14.1_

  - [x] 19.3 Configure React Query global error and retry behavior
    - Set up global query client with retry: 3, retryDelay exponential backoff
    - Configure global onError to capture to monitoring service
    - Set appropriate staleTime and gcTime defaults
    - _Requirements: 11.4_

- [x] 20. Testing setup and integration tests
  - [x]* 20.1 Configure test framework and write integration tests
    - Set up Jest with React Native Testing Library
    - Configure fast-check for property tests (100 iterations minimum)
    - Set up MSW (Mock Service Worker) for API mocking
    - Write integration tests for auth flow (signup → verify → login → refresh → logout)
    - Write integration tests for send request flow (form → submit → success/error)
    - Write integration tests for feedback flow (receive → view inbox → resolve)
    - Configure coverage reporting with 70% line coverage gate on business logic
    - _Requirements: 13.5_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The architecture uses service interfaces throughout — no Supabase SDK imports in business logic modules
- Encryption keys are managed via Supabase Vault, never in source code
- All sensitive data (phone, name, feedback text) is encrypted at rest and excluded from logs

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.7"] },
    { "id": 3, "tasks": ["1.5", "1.6", "2.1"] },
    { "id": 4, "tasks": ["2.2", "2.3", "3.1", "7.1"] },
    { "id": 5, "tasks": ["2.4", "3.2", "3.3", "7.2", "7.7"] },
    { "id": 6, "tasks": ["3.4", "3.5", "7.3", "7.4", "7.5", "7.6", "7.8"] },
    { "id": 7, "tasks": ["5.1", "6.1", "6.2", "8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["5.2", "9.1", "9.4"] },
    { "id": 9, "tasks": ["9.2", "9.3", "9.5", "9.6"] },
    { "id": 10, "tasks": ["11.1", "12.1", "12.3"] },
    { "id": 11, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "12.2"] },
    { "id": 12, "tasks": ["11.7", "13.1", "13.3"] },
    { "id": 13, "tasks": ["13.2", "15.1", "15.2"] },
    { "id": 14, "tasks": ["15.3", "16.1"] },
    { "id": 15, "tasks": ["16.2", "16.3"] },
    { "id": 16, "tasks": ["17.1", "17.2", "17.3", "17.5", "18.1"] },
    { "id": 17, "tasks": ["17.4", "18.2", "18.3"] },
    { "id": 18, "tasks": ["19.1", "19.2", "19.3"] },
    { "id": 19, "tasks": ["20.1"] }
  ]
}
```
