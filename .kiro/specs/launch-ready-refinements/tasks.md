# Implementation Plan: Launch-Ready Refinements

## Overview

Targeted refinements to make the Nudgli app launch-ready. Changes span dashboard metric icons/labels, SMS messaging tone, settings page functionality (with two new edit screens), repository interface extension, and UX polish to eliminate dead ends. All work fits within the existing React Native / Expo / NativeWind / Supabase / Twilio / React Query architecture.

## Tasks

- [x] 1. Dashboard metric icons and label update
  - [x] 1.1 Update DashboardMetrics component icons and rename label
    - In `src/features/dashboard/components/DashboardMetrics.tsx`:
    - Replace Positive Responses icon from `thumbs-up` (filled) to `checkmark-outline` (outlined)
    - Replace Needs Attention icon from `alert-circle` (filled) to `alert-circle-outline` (outlined)
    - Replace Response Rate icon from `pulse` (filled) to `trending-up-outline` (outlined)
    - Update Needs Attention background from `bg-orange-100` to `bg-amber-100`
    - Rename label text "Needs\nAttention" → "Needs\nFollow-up"
    - _Requirements: 2.2, 3.2, 4.4, 5.1, 5.2, 5.3_

  - [ ]* 1.2 Write property test for feedback partitioning (Property 2)
    - **Property 2: Feedback partitioning by rating threshold**
    - Use `fast-check` to generate arrays of feedback records with ratings in [1,5]
    - Assert: count of records with rating >= 4 equals positiveResponses, count with rating <= 3 equals needsFollowUp, and their sum equals total
    - **Validates: Requirements 2.1, 3.1**

  - [ ]* 1.3 Write property test for month-over-month calculation (Property 1)
    - **Property 1: Month-over-month calculation correctness**
    - Use `fast-check` to generate (currentMonthCount, previousMonthCount) pairs as non-negative integers
    - Assert: when previous > 0, result equals `round((current - previous) / previous * 100)`; when previous is 0, result is null
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 1.4 Write property test for response rate calculation (Property 3)
    - **Property 3: Response rate calculation**
    - Use `fast-check` to generate (totalResponses, totalRequestsSent) pairs as non-negative integers
    - Assert: when totalRequestsSent > 0, result equals `round(totalResponses / totalRequestsSent * 100)`; when totalRequestsSent is 0, result is null
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 2. SMS messaging tone updates
  - [x] 2.1 Update Twilio adapter positive and negative response messages
    - In `supabase/functions/_shared/adapters/twilio.adapter.ts`:
    - Update `buildPositiveResponse` message to: "Thanks so much — that really means a lot to us! If you have a moment, we'd love for you to share your experience on Google. It makes a huge difference for our small business: {googleReviewUrl}"
    - Update `buildNegativeResponse` message to: "Thank you for your honesty — we're sorry your experience didn't meet expectations. Someone from our team will reach out to you shortly to make things right."
    - The negative response no longer solicits written feedback (no question marks, no URLs)
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 2.2 Write property test for positive SMS URL inclusion (Property 4)
    - **Property 4: Positive SMS response contains Google Review URL**
    - Use `fast-check` with `fc.webUrl()` generator
    - Assert: `buildPositiveResponse(url)` output contains the exact URL string
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 2.3 Write property test for negative SMS exclusions (Property 5)
    - **Property 5: Negative SMS response excludes URLs and feedback solicitation**
    - Assert: `buildNegativeResponse()` output contains no `http://` or `https://` substrings and no question marks
    - **Validates: Requirements 7.2, 7.4**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend IBusinessProfileRepository with update method
  - [x] 4.1 Add update method to interface and implement in Supabase adapter
    - In `src/services/interfaces/database.service.ts`: add `update(businessId: string, data: Partial<Pick<BusinessProfile, 'firstName' | 'lastName' | 'businessName' | 'googleReviewUrl'>>): Promise<Result<BusinessProfile>>` to `IBusinessProfileRepository`
    - In `src/infrastructure/supabase/repositories/business-profile.repository.ts`: implement `update()` method using Supabase `.update()` on the business_profiles table, mapping camelCase fields to snake_case columns
    - In `src/infrastructure/mock/mock-services.ts`: add mock `update()` method to `MockBusinessProfileRepository`
    - _Requirements: 9.2, 10.2_

- [x] 5. Settings screen — make fully functional
  - [x] 5.1 Rewrite settings screen with navigable action rows
    - In `src/app/(tabs)/settings.tsx`:
    - Replace read-only account section with pressable rows: Business (→ `/edit-business`), User Profile (→ `/edit-profile`), Subscription (→ `/subscription`)
    - Use outlined Ionicons: `business-outline`, `person-outline`, `card-outline`
    - Add chevron indicators on navigable rows
    - _Requirements: 9.1, 10.1, 11.1, 11.2_

  - [x] 5.2 Add Notifications toggle, Support mailto, and Website link to settings
    - In `src/app/(tabs)/settings.tsx`:
    - Add Notifications row with a functional toggle switch using `expo-notifications` permissions API
    - Add Support row showing "support@nudgli.app" that opens `mailto:support@nudgli.app` via `Linking.openURL`
    - Add Website row showing "nudgli.app" that opens `https://nudgli.app` via `Linking.openURL`
    - Keep App Version display row and Log Out button
    - Use outlined Ionicons: `notifications-outline`, `mail-outline`, `globe-outline`, `information-circle-outline`, `log-out-outline`
    - _Requirements: 12.1, 12.2, 12.3, 13.1, 14.1, 14.2, 15.1, 15.2_

- [x] 6. New screens — Edit Business and Edit Profile
  - [x] 6.1 Create edit-business screen
    - Create `src/app/edit-business.tsx`
    - Form fields: Business Name (text input), Google Review URL (text input)
    - Pre-fill from `useBusinessProfile()` hook data
    - Save button calls `businessProfileRepo.update({ businessName, googleReviewUrl })`
    - Show inline error message on failure, keep form data for retry
    - Navigate back on success
    - _Requirements: 9.1, 9.2, 16.1_

  - [x] 6.2 Create edit-profile screen
    - Create `src/app/edit-profile.tsx`
    - Form fields: First Name (text input), Last Name (text input), Email (read-only display)
    - Pre-fill from `useBusinessProfile()` hook data
    - Save button calls `businessProfileRepo.update({ firstName, lastName })`
    - Show inline error message on failure, keep form data for retry
    - Navigate back on success
    - _Requirements: 10.1, 10.2, 16.1_

  - [ ]* 6.3 Write property test for resolving feedback (Property 6)
    - **Property 6: Resolving feedback removes it from the unresolved set**
    - Use `fast-check` with `fc.uuid()` for feedback IDs
    - Assert: after calling `markResolved` on a feedback record, it no longer appears in the unresolved feedback list for that business
    - **Validates: Requirements 8.3**

- [x] 7. UX polish — eliminate dead ends
  - [x] 7.1 Audit and fix dead-end or placeholder elements
    - Review all screens for non-functional interactive elements, placeholder text, or "coming soon" labels
    - Ensure every button, link, and pressable row performs a real navigation, action, or external launch
    - Verify inbox screen has no TextInput or message-send affordance (confirm existing state is correct)
    - Verify all error states show appropriate messages rather than blank/broken UI
    - _Requirements: 16.1, 16.2, 16.3, 8.4_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Testing framework (`jest`, `@testing-library/react-native`, `fast-check`) will need to be added to devDependencies before running property tests
- The `awaiting_feedback_text` state handling remains in the Twilio webhook for backwards compatibility with in-flight conversations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.2", "2.3", "5.1"] },
    { "id": 2, "tasks": ["5.2", "6.1", "6.2"] },
    { "id": 3, "tasks": ["6.3", "7.1"] }
  ]
}
```
