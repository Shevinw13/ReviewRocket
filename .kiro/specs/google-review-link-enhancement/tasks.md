# Implementation Plan: Google Review Link Enhancement

## Overview

Replace the plain-text Google Review URL field with a search-first experience powered by the Google Places API (New). Implementation proceeds bottom-up: utility functions → service interface → Edge Function → hook → UI components → integration into existing screens. Both the signup form and edit-business screen share a single reusable `GoogleReviewLinkPicker` compound component.

## Tasks

- [x] 1. Utility functions and service interface
  - [x] 1.1 Create `buildGoogleReviewUrl` and `validateGoogleReviewUrl` utility functions
    - Create `src/features/google-review/utils/googleReviewUrl.ts`
    - Implement `buildGoogleReviewUrl(placeId: string): string` that returns `https://search.google.com/local/writereview?placeid={placeId}`
    - Implement `validateGoogleReviewUrl(url: string): boolean` that matches accepted patterns: `google.com/maps`, `maps.google.com`, `g.page`, `search.google.com/local/writereview`
    - Export both functions from a feature barrel `src/features/google-review/index.ts`
    - _Requirements: 1.5, 2.3, 2.4, 2.5_

  - [ ]* 1.2 Write property tests for `buildGoogleReviewUrl` (Property 2)
    - **Property 2: Google Review URL construction**
    - Use `fast-check` to generate random alphanumeric Place ID strings
    - Verify round-trip: parse the returned URL's `placeid` query param and assert it equals the original input
    - **Validates: Requirements 1.5**

  - [ ]* 1.3 Write property tests for `validateGoogleReviewUrl` (Property 3)
    - **Property 3: URL validation correctly classifies patterns**
    - Use `fast-check` to generate URLs with accepted domain patterns (should return true) and arbitrary non-matching URLs (should return false)
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [x] 1.4 Create `IPlacesSearchService` interface and register in the service registry
    - Create `src/services/interfaces/places-search.service.ts` with `IPlacesSearchService` interface containing `search(query: string): Promise<Result<PlaceResult[]>>`
    - Define `PlaceResult` type: `{ placeId: string; name: string; formattedAddress: string; rating?: number }`
    - Add `placesSearch: IPlacesSearchService` to `ServiceRegistry` in `src/services/index.ts`
    - Re-export the interface from `src/services/index.ts`
    - _Requirements: 3.1_

  - [x] 1.5 Create `MockPlacesSearchService` for development and testing
    - Create `src/services/mocks/MockPlacesSearchService.ts`
    - Implement `IPlacesSearchService` with realistic fake results (3-5 entries with plausible names, addresses, ratings)
    - Support edge cases: empty query returns empty, short query returns empty, "error" query simulates failure
    - Register in mock service provider used during development
    - _Requirements: 3.1, 3.5, 3.6_

- [x] 2. Edge Function: Google Places Search proxy
  - [x] 2.1 Create the `google-places-search` Supabase Edge Function
    - Create `supabase/functions/google-places-search/index.ts`
    - Implement JWT authentication using Supabase client helpers
    - Reject unauthenticated requests with HTTP 401 and `{ error: { code: "AUTH_ERROR", message: "..." } }`
    - Validate query parameter: reject queries < 3 characters with `{ results: [] }` (HTTP 200)
    - Call Google Places API (New) Text Search endpoint: `POST https://places.googleapis.com/v1/places:searchText`
    - Map response to `PlaceResult[]`, cap at 5 results
    - Handle Google API errors: return HTTP 502 with `{ error: { code: "UPSTREAM_ERROR", message: "..." } }`
    - Read `GOOGLE_PLACES_API_KEY` from environment; never include in response payloads
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 2.2 Write property tests for proxy response transformation (Property 4)
    - **Property 4: Proxy response transformation preserves required fields**
    - Use `fast-check` to generate random Google Places API response objects
    - Verify every transformed entry has non-empty `placeId`, `name`, `formattedAddress`, and `rating` if present in source
    - **Validates: Requirements 3.1, 1.3**

  - [ ]* 2.3 Write property tests for result limiting (Property 5)
    - **Property 5: Proxy result limiting invariant**
    - Use `fast-check` to generate arrays of 0–20 mock place entries
    - Verify output length is always ≤ 5 and entries are a prefix of the input
    - **Validates: Requirements 3.5**

  - [ ]* 2.4 Write property tests for short query guard (Property 6)
    - **Property 6: Proxy rejects short queries without external call**
    - Use `fast-check` to generate strings of length 0–2
    - Verify empty result array returned, no external call made (mock the Google API call)
    - **Validates: Requirements 3.6**

- [x] 3. Checkpoint - Ensure utility and proxy tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Client-side service adapter and hook
  - [x] 4.1 Create `SupabasePlacesSearchService` adapter
    - Create `src/services/adapters/SupabasePlacesSearchService.ts`
    - Implement `IPlacesSearchService.search()` by calling the Edge Function endpoint with the user's JWT
    - Map successful response to `Result<PlaceResult[]>` with success/failure handling
    - Handle network errors, 401, and 502 responses with appropriate `Result` error codes
    - _Requirements: 3.1, 3.3, 6.1, 6.3_

  - [x] 4.2 Create `usePlacesSearch` React Query hook
    - Create `src/features/google-review/hooks/usePlacesSearch.ts`
    - Accept `UsePlacesSearchOptions` with `debounceMs` (default 300) and `minChars` (default 3)
    - Implement debounce logic using a timer ref; only fire query when query length ≥ minChars after debounce
    - Use `@tanstack/react-query` `useQuery` with the `placesSearch` service from `useService`
    - Return `{ query, setQuery, results, isLoading, isError, error }`
    - Disable query when query length < minChars (React Query `enabled` flag)
    - _Requirements: 1.2, 1.8, 3.6_

  - [ ]* 4.3 Write property test for debounce threshold (Property 1)
    - **Property 1: Debounce threshold prevents premature search**
    - Use `fast-check` to generate strings of length 0–2
    - Verify `usePlacesSearch` does NOT trigger a search request for any string < 3 characters
    - **Validates: Requirements 1.2, 3.6**

- [x] 5. UI Components
  - [x] 5.1 Create `PlacesSearchResultItem` component
    - Create `src/features/google-review/components/PlacesSearchResultItem.tsx`
    - Display business name (bold), formatted address, and optional star rating
    - Accept `onSelect` press handler prop
    - Follow existing NativeWind/Tailwind design patterns from the project
    - Include accessibility labels and roles
    - _Requirements: 1.4_

  - [x] 5.2 Create `PlacesSearchField` component
    - Create `src/features/google-review/components/PlacesSearchField.tsx`
    - Render text input labeled "Find Your Business" with placeholder "Search by business name..."
    - Wire to `usePlacesSearch` hook; show loading indicator while search is in-flight
    - Render list of `PlacesSearchResultItem` components for results
    - Display "No businesses found..." message when results are empty and query length ≥ 3
    - Display search error messages per the error handling design
    - _Requirements: 1.1, 1.2, 1.4, 1.8, 6.1, 6.2, 6.3_

  - [x] 5.3 Create `ManualUrlInput` component
    - Create `src/features/google-review/components/ManualUrlInput.tsx`
    - Render text input labeled "Paste Google Review Link" with placeholder "https://..."
    - Use `validateGoogleReviewUrl` for live validation on text change
    - Display "✓ Valid Google Review URL" on valid input
    - Display "Please enter a valid Google Business review link." on invalid input
    - Call `onValidUrl(url)` callback when a valid URL is entered
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.4 Create `ConnectedBusinessCard` component
    - Create `src/features/google-review/components/ConnectedBusinessCard.tsx`
    - Display currently connected business name and Google Review URL
    - Show a "Change" action that resets to the search/manual entry state
    - Style with existing card patterns from `src/components/ui/Card.tsx`
    - _Requirements: 5.2_

  - [x] 5.5 Create `GoogleReviewLinkPicker` compound component
    - Create `src/features/google-review/components/GoogleReviewLinkPicker.tsx`
    - Orchestrate `PlacesSearchField`, `ManualUrlInput`, and `ConnectedBusinessCard`
    - Show visual divider labeled "or" between search and manual entry sections
    - Accept props: `initialValue?: GoogleReviewLinkPickerValue`, `onBusinessConnected: (value: GoogleReviewLinkPickerValue) => void`
    - Manage internal state: idle → searching → connected (or manual entry → connected)
    - When a result is selected: call `buildGoogleReviewUrl(placeId)`, set source to `places_search`, emit value
    - When a valid manual URL is provided: set source to `manual_url`, emit value
    - Display "✓ Google Business connected successfully" after successful selection
    - Disable save/continue until a valid selection or URL is provided (via `onBusinessConnected` callback pattern)
    - Show `ConnectedBusinessCard` when `initialValue` is provided (edit-business pre-fill)
    - _Requirements: 1.5, 1.6, 1.7, 2.1, 2.6, 4.2, 4.4, 5.2_

  - [ ]* 5.6 Write property test for selection populates correct values (Property 7)
    - **Property 7: Selection populates correct business name**
    - Use `fast-check` to generate random `PlaceResult` objects
    - Verify that selecting a result produces `GoogleReviewLinkPickerValue` with `businessName === result.name` and `googleReviewUrl === buildGoogleReviewUrl(result.placeId)`
    - **Validates: Requirements 1.5, 1.6, 4.3**

- [x] 6. Checkpoint - Ensure components render and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integration with existing screens
  - [x] 7.1 Replace Google Review URL field in signup.tsx with `GoogleReviewLinkPicker`
    - Remove the existing `FormField` for "Google Review URL" in `src/app/(auth)/signup.tsx`
    - Import and render `GoogleReviewLinkPicker` in its place
    - Wire `onBusinessConnected` to update the form's `googleReviewUrl` and `businessName` fields via `react-hook-form` `setValue`
    - Auto-populate the Business Name field when a search result is selected
    - Ensure form validation still requires a valid google review URL before submission
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Replace Google Review URL field in edit-business.tsx with `GoogleReviewLinkPicker`
    - Remove the existing Google Review URL input section in `src/app/edit-business.tsx`
    - Import and render `GoogleReviewLinkPicker` with `initialValue` set from the current business profile
    - Wire `onBusinessConnected` to update the form's `googleReviewUrl` and `businessName` fields
    - Ensure save button remains disabled until a valid selection or URL change is made
    - Handle save failure by displaying error message and retaining previous values
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 7.3 Write unit tests for signup and edit-business integration
    - Test that `GoogleReviewLinkPicker` renders in both screens
    - Test that selecting a search result updates form values correctly
    - Test that save/continue is disabled without a valid selection
    - Test error states display appropriate messages
    - _Requirements: 4.1, 4.2, 5.1, 5.3, 5.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `MockPlacesSearchService` allows full UI development without needing the Edge Function deployed
- All error messages direct users to the manual URL fallback as an alternative path
- The design uses TypeScript throughout; all implementation follows the existing project patterns (React Native, Expo, NativeWind, React Hook Form, Zod, TanStack React Query)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1", "5.3", "5.4"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.5"] },
    { "id": 7, "tasks": ["5.6", "7.1", "7.2"] },
    { "id": 8, "tasks": ["7.3"] }
  ]
}
```
