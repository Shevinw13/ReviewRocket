# Implementation Plan: SMS Opt-Out Handling

## Overview

This plan implements SMS opt-out compliance handling for Nudgli. The implementation progresses from database schema through backend webhook/send logic, then frontend UI updates, and finally property-based tests. Each task builds incrementally — database and types first, then backend logic that depends on them, then frontend components that consume the data, and tests that validate the whole stack.

## Tasks

- [x] 1. Database migration and core types
  - [x] 1.1 Create Supabase migration for `sms_opt_outs`, `inbox_items`, and `activity_feed` tables
    - Create a new migration file in `supabase/migrations/`
    - Define `sms_opt_outs` table with id, business_id (FK), customer_phone_hash, customer_name_encrypted, is_active, opted_out_at, opted_in_at, created_at, updated_at
    - Add UNIQUE constraint on (business_id, customer_phone_hash)
    - Add partial index `idx_sms_opt_outs_lookup` on (customer_phone_hash, business_id) WHERE is_active = true
    - Define `inbox_items` table with id, business_id (FK), type (CHECK 'opt_out'|'system'), title, body, is_dismissed, metadata (JSONB), created_at
    - Add partial index `idx_inbox_items_active` on (business_id, created_at DESC) WHERE is_dismissed = false
    - Define `activity_feed` table with id, business_id (FK), type (CHECK 'rating'|'sms_opt_out'|'sms_opt_in'), customer_name, customer_phone_formatted, description, metadata (JSONB), created_at
    - Add index `idx_activity_feed_business` on (business_id, created_at DESC)
    - _Requirements: 1.1, 1.2, 2.1, 3.1_

  - [x] 1.2 Extend frontend domain types for opt-out, inbox items, and activity feed
    - Add `OPT_OUT = 'OPT_OUT'` to the `ErrorCode` enum in `src/types/result.ts`
    - Add `InboxItem` interface to `src/types/domain.ts` with id, businessId, type ('opt_out'|'system'), title, body, isDismissed, metadata, createdAt
    - Extend `ActivityItem` interface in `src/types/domain.ts` to add `type` field ('rating'|'sms_opt_out'|'sms_opt_in'), optional `customerPhoneFormatted`, and make `rating` optional
    - Export new types from `src/types/index.ts`
    - _Requirements: 4.1, 2.1, 3.1_

- [x] 2. Backend: Supabase adapter functions
  - [x] 2.1 Implement `createOptOutRecord` in `supabase.adapter.ts`
    - Add function that inserts into `sms_opt_outs` with ON CONFLICT DO NOTHING on (business_id, customer_phone_hash)
    - Return `{ id, created: boolean }` indicating whether a new record was inserted or existing found
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Implement `deactivateOptOutRecord` in `supabase.adapter.ts`
    - Add function that updates `sms_opt_outs` SET is_active = false, opted_in_at = now() WHERE business_id = ? AND customer_phone_hash = ? AND is_active = true
    - _Requirements: 5.1_

  - [x] 2.3 Implement `checkOptOutStatus` in `supabase.adapter.ts`
    - Add function that queries `sms_opt_outs` for active record matching phone_hash + business_id
    - Return boolean indicating whether an active opt-out exists
    - _Requirements: 4.1, 4.4_

  - [x] 2.4 Implement `createInboxItem` in `supabase.adapter.ts`
    - Add function that inserts into `inbox_items` with business_id, type, title, body, metadata
    - Return `{ id }` of the created record
    - _Requirements: 2.1, 2.2_

  - [x] 2.5 Implement `createActivityFeedEntry` in `supabase.adapter.ts`
    - Add function that inserts into `activity_feed` with business_id, type, customer_name, customer_phone_formatted, description, metadata
    - Return `{ id }` of the created record
    - _Requirements: 3.1, 3.2, 5.3_

- [x] 3. Backend: Utility formatting functions
  - [x] 3.1 Create opt-out message formatting utilities
    - Create `supabase/functions/_shared/utils/opt-out-format.ts`
    - Implement `formatOptOutInboxBody(customerName?, phoneFormatted?)` — returns body text per Requirement 2.2
    - Implement `formatOptOutActivityDescription(customerName?, phoneFormatted?)` — returns "{Name} opted out of SMS messaging"
    - Implement `formatOptInActivityDescription(customerName?, phoneFormatted?)` — returns "{Name} opted back in to SMS messaging"
    - Fallback to "A customer" when neither name nor phone is available
    - _Requirements: 2.2, 3.1, 5.3_

  - [ ]* 3.2 Write property tests for formatting utilities (Property 4, 6, 12)
    - **Property 4: Inbox item creation with correct format**
    - **Property 6: Activity entry creation with correct format and timestamp**
    - **Property 12: Opt-in activity entry**
    - Use fast-check to generate arbitrary customer names and phone numbers
    - Verify output always contains the customer name or formatted phone, or falls back to "A customer"
    - Verify description matches the expected pattern for opt-out and opt-in entries
    - **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 5.3**

- [x] 4. Checkpoint - Ensure database and adapter layer compiles
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Backend: Twilio webhook extension for opt-out/opt-in
  - [x] 5.1 Extend `twilio-webhook` Edge Function to handle opt-out notifications
    - Detect opt-out via Twilio's `OptOutType` field or `SmsStatus=undelivered` + `ErrorCode=21610`
    - On opt-out: compute phone hash, call `createOptOutRecord`, call `createInboxItem` with "Customer Opted Out" title and formatted body, call `createActivityFeedEntry` with type 'sms_opt_out'
    - Look up customer name from existing `review_requests` by phone hash for the business, if available
    - Return empty TwiML response (HTTP 200) to Twilio in all cases
    - Handle malformed payloads: log error and return 200 without creating records
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2_

  - [x] 5.2 Extend `twilio-webhook` Edge Function to handle opt-in (START) notifications
    - Detect opt-in via Twilio's `OptOutType=START` field
    - On opt-in: compute phone hash, call `deactivateOptOutRecord`, call `createActivityFeedEntry` with type 'sms_opt_in'
    - If no existing opt-out record found, no-op (return 200)
    - _Requirements: 5.1, 5.3_

  - [ ]* 5.3 Write property tests for webhook opt-out handling (Property 1, 2, 3)
    - **Property 1: Opt-out record creation with correct fields**
    - **Property 2: Opt-out idempotency**
    - **Property 3: Malformed payload rejection**
    - Use fast-check to generate valid and malformed Twilio webhook payloads
    - Verify opt-out creates record with correct phone hash, business ID, and timestamp
    - Verify processing the same opt-out twice results in exactly one record
    - Verify malformed payloads return 200 without creating any records
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 6. Backend: send-sms extension with opt-out check
  - [x] 6.1 Add opt-out check to `send-sms` Edge Function
    - After phone hash computation and before quota check, call `checkOptOutStatus`
    - If opted out, return HTTP 409 with `{ error: { code: "OPT_OUT", message: "This customer has opted out of receiving SMS messages." } }`
    - If `checkOptOutStatus` query fails, log warning and proceed (fail-open per design)
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ]* 6.2 Write property tests for send-sms opt-out blocking (Property 8, 9, 10, 11)
    - **Property 8: Send blocked and quota preserved for opted-out numbers**
    - **Property 9: Phone normalization equivalence**
    - **Property 10: Opt-in deactivates record**
    - **Property 11: Opt-out/Opt-in round trip restores send capability**
    - Use fast-check to generate phone numbers in various formats
    - Verify send is blocked for opted-out numbers and quota is unchanged
    - Verify normalized phone formats all produce the same opt-out check result
    - Verify opt-in deactivates record and restores send capability
    - **Validates: Requirements 4.1, 4.4, 4.5, 5.1, 5.2**

- [x] 7. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend: Send Request screen opt-out handling
  - [x] 8.1 Handle `OPT_OUT` error code in send-request screen
    - In `src/app/send-request.tsx`, add a check for `ErrorCode.OPT_OUT` in the error handling block
    - Show `Alert.alert` with title "Unable to Send Request" and body: "This customer has opted out of receiving SMS messages. To respect their communication preferences, Nudgli cannot send additional review requests unless they opt back in."
    - Display a single "OK" button to dismiss
    - Return early without showing the generic error message
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Frontend: Inbox feature extension
  - [x] 9.1 Add `IInboxItemRepository` interface and service registration
    - Create `getActive(businessId: string): Promise<Result<InboxItem[]>>` method
    - Create `dismiss(itemId: string): Promise<Result<void>>` method
    - Add `inboxItems` key to `ServiceRegistry` in `src/services/index.ts`
    - _Requirements: 2.1, 2.4_

  - [x] 9.2 Create `OptOutCard` component
    - Create `src/features/inbox/components/OptOutCard.tsx`
    - Render informational-style card with Ionicons `information-circle` icon in teal color
    - Display title "Customer Opted Out"
    - Display body text with customer name or formatted phone number
    - Show single "Dismiss" button
    - Use informational (teal/blue) styling, not error (red) styling
    - _Requirements: 2.2, 2.3, 2.5_

  - [x] 9.3 Create `useInboxItems` hook
    - Create `src/features/inbox/hooks/useInboxItems.ts`
    - Use React Query to fetch active (non-dismissed) inbox items for the business
    - Expose `dismiss` mutation that calls the repository's dismiss method and invalidates the query
    - _Requirements: 2.1, 2.4_

  - [x] 9.4 Extend Inbox screen to display opt-out inbox items
    - In `src/app/(tabs)/inbox.tsx`, import and render `OptOutCard` items above or alongside feedback cards
    - Fetch inbox items using `useInboxItems` hook
    - Wire "Dismiss" button to the dismiss mutation
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ]* 9.5 Write property test for inbox dismiss behavior (Property 5)
    - **Property 5: Dismiss removes inbox item from active view**
    - Use fast-check to generate sets of inbox items, dismiss arbitrary ones
    - Verify dismissed items never appear in active query results
    - **Validates: Requirements 2.4**

- [x] 10. Frontend: Activity feed extension
  - [x] 10.1 Update `useRecentActivity` hook to fetch from `activity_feed` table
    - Modify the existing hook to query the new `activity_feed` table
    - Support mixed types: 'rating', 'sms_opt_out', 'sms_opt_in'
    - Sort by created_at descending (newest first)
    - _Requirements: 3.1, 3.4_

  - [x] 10.2 Extend `RecentActivityFeed` component to render opt-out/opt-in items
    - In `src/components/feedback/RecentActivityFeed.tsx`, handle `type === 'sms_opt_out'` and `type === 'sms_opt_in'`
    - Render with `information-circle` icon in teal/blue for opt-out items (not stars)
    - Render opt-in items with a checkmark or similar positive icon
    - Display description text (e.g., "Sarah opted out of SMS messaging")
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ]* 10.3 Write property test for activity feed chronological ordering (Property 7)
    - **Property 7: Activity feed chronological ordering**
    - Use fast-check to generate mixed activity entries with random timestamps
    - Verify the resulting list is always sorted by timestamp descending
    - **Validates: Requirements 3.4**

- [x] 11. Frontend: Mock service updates
  - [x] 11.1 Add mock `IInboxItemRepository` implementation
    - In `src/infrastructure/mock/mock-services.ts`, add `MockInboxItemRepository` class
    - Return fake opt-out inbox items for local development
    - Implement `dismiss` to filter out the dismissed item
    - Register in `createMockServiceRegistry()` under the `inboxItems` key
    - _Requirements: 2.1, 2.4_

  - [x] 11.2 Update `MockSmsService` to simulate opt-out error
    - Add a hardcoded "opted-out" phone number that returns `{ success: false, error: { code: ErrorCode.OPT_OUT, message: '...' } }`
    - Allows testing the opt-out Alert dialog in local development
    - _Requirements: 4.1, 4.2_

  - [x] 11.3 Update mock activity data to include opt-out/opt-in entries
    - Add sample `sms_opt_out` and `sms_opt_in` items to the mock activity feed data
    - Update mock data generator to use the extended `ActivityItem` type
    - _Requirements: 3.1, 5.3_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend (Supabase Edge Functions) uses Deno/TypeScript; the frontend uses React Native/TypeScript with Expo
- Twilio already handles STOP/START at the carrier level — our implementation adds UX tracking and compliance feedback

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1", "5.2", "6.1", "9.1"] },
    { "id": 3, "tasks": ["5.3", "6.2", "8.1", "9.2", "9.3"] },
    { "id": 4, "tasks": ["9.4", "9.5", "10.1", "11.1", "11.2", "11.3"] },
    { "id": 5, "tasks": ["10.2", "10.3"] }
  ]
}
```
