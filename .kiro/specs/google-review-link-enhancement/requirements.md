# Requirements Document

## Introduction

The Google Review Link Enhancement feature reduces onboarding friction by replacing the manual Google Review URL paste field with a search-first approach. Business owners can search for their business using the Google Places API, which automatically populates the business name and constructs the correct Google Review URL from the Place ID. A manual URL entry option remains as a fallback. This enhancement applies to both the signup/onboarding flow and the edit-business settings screen.

## Glossary

- **Review_Rocket_App**: The React Native iOS mobile application built with Expo, TypeScript, and NativeWind/Tailwind
- **Business_Owner**: The authenticated user who owns a service business and is setting up or editing their Google Review link
- **Places_Search_Field**: The text input labeled "Find Your Business" where the Business Owner types a business name to trigger search
- **Google_Places_Proxy**: A Supabase Edge Function that proxies requests to the Google Places API (New), keeping the API key server-side
- **Search_Result**: A single business listing returned from the Google Places API containing a Place ID, business name, address, and optional rating
- **Place_ID**: The unique identifier returned by Google Places API used to construct the Google Review URL
- **Google_Review_URL**: The direct review link constructed as `https://search.google.com/local/writereview?placeid={Place_ID}`
- **Manual_URL_Field**: The fallback text input where a Business Owner can paste an existing Google Review URL directly
- **Valid_Google_Review_URL**: A URL matching one of the accepted patterns: domains containing "google.com", "maps.google.com", "g.page", or "search.google.com/local/writereview"

## Requirements

### Requirement 1: Business Search via Google Places API

**User Story:** As a business owner, I want to search for my business by name, so that I can connect my Google Business listing without manually finding and pasting a URL.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL display a Places_Search_Field labeled "Find Your Business" with placeholder text "Search by business name..." as the primary option for connecting a Google Business listing
2. WHEN the Business_Owner types at least 3 characters into the Places_Search_Field, THE Review_Rocket_App SHALL send a search request to the Google_Places_Proxy after a 300-millisecond debounce period following the last keystroke
3. WHEN the Google_Places_Proxy receives a search request, THE Google_Places_Proxy SHALL call the Google Places API (New) Text Search endpoint with the provided query string and return matching place results to the Review_Rocket_App
4. THE Review_Rocket_App SHALL display search results as a scrollable list, where each result shows the business name, business address, and Google rating (if available)
5. WHEN the Business_Owner selects a Search_Result, THE Review_Rocket_App SHALL populate the business name from the selected result and construct the Google_Review_URL using the format `https://search.google.com/local/writereview?placeid={Place_ID}`
6. WHEN the Business_Owner selects a Search_Result, THE Review_Rocket_App SHALL save the populated business name and constructed Google_Review_URL to the Business_Owner's profile
7. WHEN a Search_Result is successfully selected and saved, THE Review_Rocket_App SHALL display a confirmation message "✓ Google Business connected successfully"
8. WHILE a search request is in progress, THE Review_Rocket_App SHALL display a loading indicator within the search results area

### Requirement 2: Manual URL Entry Fallback

**User Story:** As a business owner who already has my Google Review link, I want to paste it directly, so that I can skip the search step and continue setup quickly.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL display the Manual_URL_Field below the Places_Search_Field, separated by a visual divider labeled "or"
2. THE Manual_URL_Field SHALL be labeled "Paste Google Review Link" with placeholder text "https://..."
3. WHEN the Business_Owner enters a URL into the Manual_URL_Field, THE Review_Rocket_App SHALL validate that the URL matches a Valid_Google_Review_URL pattern (containing "google.com", "maps.google.com", "g.page", or "search.google.com/local/writereview")
4. WHEN the entered URL matches a Valid_Google_Review_URL pattern, THE Review_Rocket_App SHALL display a success indicator "✓ Valid Google Review URL" and enable the save or continue action
5. IF the entered URL does not match a Valid_Google_Review_URL pattern, THEN THE Review_Rocket_App SHALL display an error message "Please enter a valid Google Business review link." and disable the save or continue action
6. THE Review_Rocket_App SHALL prevent the Business_Owner from saving or continuing onboarding until either a Search_Result has been selected or a Valid_Google_Review_URL has been entered in the Manual_URL_Field

### Requirement 3: Google Places Proxy Edge Function

**User Story:** As a development team, I want to proxy Google Places API calls through a server-side function, so that the API key remains secure and is not exposed in client-side code.

#### Acceptance Criteria

1. THE Google_Places_Proxy SHALL accept a text search query string and return an array of place results containing: Place_ID, business name, formatted address, and rating (if available)
2. THE Google_Places_Proxy SHALL store the Google Places API key in secure environment configuration and exclude the key from all response payloads and application logs
3. THE Google_Places_Proxy SHALL authenticate incoming requests using the Business_Owner's JWT access token and reject unauthenticated requests with an appropriate error status
4. IF the Google Places API returns an error or is unreachable, THEN THE Google_Places_Proxy SHALL return a structured error response to the Review_Rocket_App with a descriptive message indicating the search could not be completed
5. THE Google_Places_Proxy SHALL limit response results to a maximum of 5 place entries per search request to minimize data transfer and API usage costs
6. IF the Google_Places_Proxy receives a search query with fewer than 3 characters, THEN THE Google_Places_Proxy SHALL return an empty result set without calling the Google Places API

### Requirement 4: Integration with Onboarding Flow

**User Story:** As a new business owner signing up, I want the Google Business search to be part of my registration, so that I can connect my listing during initial setup without extra steps.

#### Acceptance Criteria

1. WHEN the Business_Owner is on the signup form, THE Review_Rocket_App SHALL replace the existing plain-text Google Review URL field with the combined search and manual entry interface (Places_Search_Field and Manual_URL_Field)
2. THE Review_Rocket_App SHALL display the Places_Search_Field as the recommended primary option, positioned above the Manual_URL_Field
3. WHEN the Business_Owner selects a Search_Result during signup, THE Review_Rocket_App SHALL auto-populate the Business Name field with the name from the selected result
4. THE Review_Rocket_App SHALL maintain the existing Nudgli design language including spacing, colors, typography, and card styles for the enhanced Google Review section

### Requirement 5: Integration with Edit Business Screen

**User Story:** As a business owner, I want to update my Google Business connection from the settings screen, so that I can change my linked business if needed.

#### Acceptance Criteria

1. WHEN the Business_Owner navigates to the Edit Business screen, THE Review_Rocket_App SHALL display the combined search and manual entry interface (Places_Search_Field and Manual_URL_Field) in place of the existing plain-text Google Review URL field
2. WHEN the Business_Owner already has a connected Google Business listing, THE Review_Rocket_App SHALL display the current business name and Google_Review_URL as the connected state with an option to change
3. WHEN the Business_Owner selects a new Search_Result or enters a new Valid_Google_Review_URL on the Edit Business screen, THE Review_Rocket_App SHALL update both the business name and Google_Review_URL upon saving
4. IF the save operation fails due to a network or server error, THEN THE Review_Rocket_App SHALL display an error message indicating the changes could not be saved and retain the previously saved values

### Requirement 6: Search Error Handling

**User Story:** As a business owner, I want clear feedback when the search is not working, so that I can use the manual entry option instead.

#### Acceptance Criteria

1. IF the Google_Places_Proxy returns an error response, THEN THE Review_Rocket_App SHALL display a message indicating the search is temporarily unavailable and suggest using the manual URL entry option
2. IF the search returns zero results for the entered query, THEN THE Review_Rocket_App SHALL display a message "No businesses found. Try a different search or paste your Google Review link below."
3. IF the network is unavailable when a search is attempted, THEN THE Review_Rocket_App SHALL display a message indicating that an internet connection is required for business search and suggest using the manual URL entry option
