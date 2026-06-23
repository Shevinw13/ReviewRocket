# Requirements Document

## Introduction

Review Rocket is a production-quality iOS mobile application that helps service businesses generate more Google reviews by automatically texting customers immediately after a completed service. The core workflow enables a service provider to enter a customer's phone number after completing a job, triggering an automated SMS feedback request. Customers who provide positive ratings (4-5 stars) receive a Google review link, while negative feedback (1-3 stars) is routed privately to the business owner for resolution. This MVP targets single-owner local service businesses with no AI, no CRM integrations, no multi-location support, and no multi-user support.

## Glossary

- **Review_Rocket_App**: The React Native iOS mobile application built with Expo, TypeScript, and Expo Router
- **Business_Owner**: The authenticated user who owns a service business and sends review requests to customers
- **Customer**: A person who received a service and is sent an SMS feedback request
- **SMS_Service**: The Twilio-powered messaging service owned by Review Rocket that sends and receives text messages
- **Auth_Service**: The Supabase Authentication service handling signup, login, sessions, and password management
- **Database**: The Supabase PostgreSQL database storing all application data with Row Level Security
- **Edge_Function**: A Supabase Edge Function that processes backend logic including SMS sending and webhook handling
- **Review_Request**: A record representing a single SMS feedback request sent to a customer
- **Feedback_Record**: A record storing a customer's rating and optional written feedback
- **Inbox**: The screen displaying negative feedback (ratings 1-3) requiring business owner attention
- **Dashboard**: The home screen displaying metrics, recent activity, and the primary call-to-action
- **Subscription_Service**: The Apple App Store In-App Purchase system managing SMS usage tiers
- **Push_Notification_Service**: The system that delivers real-time notifications to the Business Owner's device
- **Google_Review_URL**: The direct link to the business's Google review page provided during signup
- **SMS_Quota**: The monthly limit of SMS messages allowed based on the Business Owner's subscription tier

## Requirements

### Requirement 1: Business Owner Registration

**User Story:** As a service business owner, I want to create an account with my business details, so that I can start sending review requests to my customers.

#### Acceptance Criteria

1. WHEN a new user submits the signup form with First Name, Last Name, Business Name, Email, Password, and Google Review URL, THE Auth_Service SHALL create a new Business Owner account and send a verification email to the provided address
2. THE Auth_Service SHALL require passwords to contain between 8 and 128 characters, at least one uppercase letter, one lowercase letter, one number, and one special character
3. WHEN a user submits a signup form with an email already associated with an existing account, THE Auth_Service SHALL display an error message indicating the email is already in use
4. WHEN a user submits a signup form with a Google Review URL that does not match a valid Google Maps place URL pattern (containing "google.com/maps" or "maps.app.goo.gl"), THE Review_Rocket_App SHALL display a validation error indicating the URL must be a Google Maps review link before submission
5. THE Review_Rocket_App SHALL validate all signup form fields using Zod schemas before submitting to the Auth_Service, enforcing: First Name (1-50 characters), Last Name (1-50 characters), Business Name (1-100 characters), Email (valid email format, maximum 254 characters), Password (meeting complexity requirements), and Google Review URL (valid URL matching Google Maps pattern)
6. WHEN the Auth_Service sends a verification email, THE Review_Rocket_App SHALL display a confirmation screen instructing the Business Owner to verify their email before logging in
7. IF the signup submission fails due to a network error or server error, THEN THE Review_Rocket_App SHALL display an error message indicating the signup could not be completed and SHALL preserve the entered form data so the Business Owner can retry without re-entering information

### Requirement 2: Business Owner Authentication

**User Story:** As a registered business owner, I want to securely log in and manage my session, so that only I can access my business data.

#### Acceptance Criteria

1. WHEN a Business Owner submits valid email and password credentials, THE Auth_Service SHALL authenticate the user and return a JWT access token with a 1-hour expiration and a refresh token with a 7-day expiration
2. WHEN a Business Owner submits invalid credentials, THE Auth_Service SHALL return an error message indicating that the login credentials are incorrect without revealing whether the email or password is the cause of failure
3. WHEN a JWT access token expires and a valid refresh token exists, THE Auth_Service SHALL use the refresh token to issue a new access token without requiring re-authentication
4. WHEN a refresh token is used, THE Auth_Service SHALL rotate the refresh token and invalidate the previously used token
5. IF more than 5 failed login attempts occur within 15 minutes from the same IP address, THEN THE Auth_Service SHALL temporarily block further login attempts for 30 minutes and return an error message indicating the account is temporarily locked with the remaining lockout duration
6. WHEN a Business Owner requests a password reset, THE Auth_Service SHALL send a single-use password reset link to the registered email address that expires after 60 minutes
7. WHEN a Business Owner taps the logout button, THE Auth_Service SHALL invalidate the current session tokens and return the user to the login screen
8. IF the refresh token has expired or is invalid when a token refresh is attempted, THEN THE Auth_Service SHALL terminate the session and redirect the Business Owner to the login screen
9. IF a Business Owner attempts to log in with an email that has not been verified, THEN THE Auth_Service SHALL return an error message indicating that email verification is required before login

### Requirement 3: Send Review Request

**User Story:** As a business owner, I want to send an SMS review request to a customer after completing a service, so that I can collect feedback and generate Google reviews.

#### Acceptance Criteria

1. WHEN a Business Owner submits the Send Request form with a valid phone number, THE SMS_Service SHALL send a feedback request SMS to the provided phone number within 30 seconds
2. THE Review_Rocket_App SHALL require a valid US phone number (10 digits, formatted as (XXX) XXX-XXXX, accepting digits with or without formatting characters) in the Send Request form before enabling the Send Text button
3. THE Review_Rocket_App SHALL accept an optional Customer Name (maximum 50 characters) and an optional Service Type (free-text, maximum 50 characters) in the Send Request form
4. WHEN a review request SMS is sent successfully, THE Database SHALL create a new Review_Request record linked to the Business Owner and Customer, storing the phone number, customer name, service type, and timestamp
5. IF the SMS_Service fails to deliver a message, THEN THE Review_Rocket_App SHALL display an error message indicating the send failure and allow the Business Owner to retry sending to the same phone number
6. THE Review_Rocket_App SHALL display the sender phone number "(833) 123-4567" as informational text on the Send Request form
7. WHEN a Business Owner attempts to send a review request to a phone number that received a request within the last 24 hours, THE Review_Rocket_App SHALL display a warning and require confirmation before sending
8. WHILE the SMS is being sent, THE Review_Rocket_App SHALL display a loading indicator and disable the Send Text button to prevent duplicate submissions
9. WHEN the SMS is sent successfully, THE Review_Rocket_App SHALL display a success confirmation showing the customer phone number, customer name (if provided), and service type (if provided), and SHALL reset the form fields to empty

### Requirement 4: Customer SMS Interaction Flow

**User Story:** As a customer, I want to receive a clear text message asking for my feedback, so that I can quickly rate my experience.

#### Acceptance Criteria

1. WHEN the SMS_Service sends a feedback request, THE SMS_Service SHALL format the message as: "Hi [Customer Name], Thank you for choosing [Business Name]. Small businesses like ours rely on customer feedback to grow and improve. On a scale of 1-5, how would you rate your experience today? Reply with a number from 1 to 5."
2. WHEN no Customer Name is provided, THE SMS_Service SHALL omit the personalized greeting and begin with "Thank you for choosing [Business Name]"
3. WHEN a customer replies with a rating of 4 or 5, THE SMS_Service SHALL respond with a thank-you message containing the Business Owner's Google_Review_URL
4. WHEN a customer replies with a rating of 1, 2, or 3, THE SMS_Service SHALL respond with: "We're sorry to hear that. We'd love to understand what went wrong so we can do better. Would you mind sharing a few more details about your experience?"
5. WHEN a customer replies with written feedback after providing a rating of 1-3, THE Database SHALL store the feedback text (up to 500 characters) in the associated Feedback_Record
6. IF a customer replies with written feedback exceeding 500 characters after providing a rating of 1-3, THEN THE Database SHALL store only the first 500 characters of the feedback text in the associated Feedback_Record
7. IF a customer replies with an invalid response that is not a number from 1 to 5, THEN THE SMS_Service SHALL reply asking the customer to respond with a number from 1 to 5
8. IF a customer replies with an invalid response 2 consecutive times, THEN THE SMS_Service SHALL send a final message indicating the conversation has ended and SHALL NOT send further retry prompts
9. WHEN a customer provides a rating, THE Database SHALL update the associated Review_Request record (matched via the customer's phone number) with the rating value and mark feedback as received
10. IF a customer replies more than 72 hours after the feedback request was sent, THEN THE SMS_Service SHALL NOT process the reply and SHALL NOT send a response

### Requirement 5: Dashboard Display

**User Story:** As a business owner, I want to see my review performance metrics at a glance, so that I can track how my feedback collection efforts are performing.

#### Acceptance Criteria

1. WHEN the Business Owner navigates to the Dashboard, THE Review_Rocket_App SHALL display a greeting with the Business Name
2. THE Dashboard SHALL display the "Review Opportunities Created" count representing total review requests sent in the current calendar month
3. THE Dashboard SHALL display a month-over-month comparison showing the percentage change from the previous calendar month, rounded to the nearest whole number; IF the previous month has zero requests, THEN THE Dashboard SHALL display the comparison as "N/A" instead of a percentage
4. THE Dashboard SHALL display metrics for Positive Responses (ratings 4-5), Needs Attention (ratings 1-3), and total Requests Sent for the current calendar month
5. THE Dashboard SHALL display a "Send Review Request" call-to-action button that navigates to the Send Request screen
6. THE Dashboard SHALL display a Recent Activity Feed showing the 10 most recent customer ratings with customer name and rating value, ordered from newest to oldest
7. WHEN the Dashboard is pulled down, THE Review_Rocket_App SHALL refresh all displayed metrics and activity data and indicate loading state until data is returned or a 10-second timeout is reached
8. IF the Business Owner has no review requests or feedback for the current calendar month, THEN THE Dashboard SHALL display zero for all metric counts and an empty state message in the Recent Activity Feed indicating no activity yet

### Requirement 6: Feedback Inbox

**User Story:** As a business owner, I want to view and manage negative customer feedback, so that I can address issues and improve customer satisfaction.

#### Acceptance Criteria

1. WHEN the Business Owner navigates to the Inbox, THE Review_Rocket_App SHALL display all Feedback_Records with ratings of 1-3 that are unresolved, sorted by most recent feedback date first
2. THE Inbox SHALL display each feedback item as a card showing Customer Name, Rating, Feedback Text (if provided), and the date the feedback was received; IF no written feedback was provided, THEN THE Inbox SHALL display the card without a Feedback Text section
3. WHEN the Business Owner taps "Call Customer" on a feedback card, THE Review_Rocket_App SHALL initiate a phone call to the customer's phone number using the device phone dialer
4. WHEN the Business Owner taps "Mark Resolved" on a feedback card, THE Database SHALL update the Feedback_Record with resolved status and current timestamp, and THE Inbox SHALL remove the card from the "Needs Attention" view
5. IF the "Mark Resolved" action fails due to a network or server error, THEN THE Review_Rocket_App SHALL display an error message indicating the feedback could not be resolved and retain the card in its current state
6. THE Inbox SHALL provide filter options as tabs to toggle between "Needs Attention" (unresolved only) and "All Feedback" (including resolved), with the "Needs Attention" tab displaying a badge showing the count of unresolved feedback items
7. WHEN no unresolved feedback exists, THE Inbox SHALL display an empty state message indicating no items need attention

### Requirement 7: Push Notifications

**User Story:** As a business owner, I want to receive push notifications for important events, so that I can respond quickly to customer feedback.

#### Acceptance Criteria

1. WHEN a customer submits a rating of 1, 2, or 3, THE Push_Notification_Service SHALL send a push notification to the Business Owner's device within 60 seconds, displaying the Customer Name (or phone number if no name is available) and the rating value
2. WHEN a customer submits written feedback after a negative rating, THE Push_Notification_Service SHALL send a push notification to the Business Owner within 60 seconds, indicating the Customer Name (or phone number if no name is available) and that new written feedback is available
3. WHEN the Business Owner's monthly SMS usage reaches 80% of the SMS_Quota, THE Push_Notification_Service SHALL send a notification alerting the Business Owner of the approaching limit and displaying the current usage count and quota limit
4. WHEN the Business Owner taps a feedback push notification and is authenticated, THE Review_Rocket_App SHALL navigate directly to the relevant feedback item in the Inbox
5. IF the Business Owner taps a feedback push notification and is not authenticated, THEN THE Review_Rocket_App SHALL present the login screen and navigate to the relevant feedback item in the Inbox after successful authentication
6. IF the Business Owner has not granted push notification permissions, THEN THE Review_Rocket_App SHALL display an in-app prompt explaining the value of notifications and provide a button to open device notification settings

### Requirement 8: Subscription and Usage Management

**User Story:** As a business owner, I want to manage my subscription and track SMS usage, so that I can ensure uninterrupted service and upgrade when needed.

#### Acceptance Criteria

1. THE Subscription_Service SHALL offer three tiers: Starter (250 SMS/month), Growth (1000 SMS/month), and Pro (5000 SMS/month), with Starter as the default tier assigned to new Business Owner accounts
2. THE Review_Rocket_App SHALL display the current SMS usage count and remaining quota on the Settings screen, updated each time the Settings screen is opened
3. IF a Business Owner attempts to send a review request and the SMS_Quota has been reached, THEN THE Review_Rocket_App SHALL prevent the request and navigate the Business Owner to the subscription tier selection screen with a message indicating the quota has been exceeded
4. WHEN a Business Owner selects a subscription tier change, THE Review_Rocket_App SHALL initiate the Apple App Store In-App Purchase flow
5. IF the Apple App Store In-App Purchase flow fails or is cancelled by the Business Owner, THEN THE Review_Rocket_App SHALL retain the current subscription tier unchanged and display a message indicating the purchase was not completed
6. THE Database SHALL track monthly SMS usage per Business Owner and reset the count at the start of each billing period, defined as the subscription anniversary date managed by the App Store
7. WHEN a subscription purchase is confirmed by the App Store, THE Subscription_Service SHALL update the Business Owner's tier and SMS_Quota within 10 seconds of receiving the confirmation

### Requirement 9: Navigation and App Structure

**User Story:** As a business owner, I want intuitive navigation between app sections, so that I can quickly access the features I need.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL provide bottom tab navigation with three tabs: Home (Dashboard), Inbox, and Settings, each displaying a labeled icon and highlighting the currently active tab
2. WHEN the Review_Rocket_App launches, THE Review_Rocket_App SHALL display the Dashboard as the default screen for authenticated users
3. WHEN an unauthenticated user opens the Review_Rocket_App, THE Review_Rocket_App SHALL display the login screen
4. WHEN a Business Owner switches between bottom tabs, THE Review_Rocket_App SHALL preserve each tab's scroll position and nested screen stack so that returning to a tab resumes where the user left off
5. THE Review_Rocket_App SHALL display a numeric badge on the Inbox tab indicating the count of unresolved Feedback_Records with ratings of 1-3, updating within 5 seconds of a new feedback arrival

### Requirement 10: Data Security and Privacy

**User Story:** As a business owner, I want my customers' data to be securely stored and transmitted, so that I maintain trust and comply with privacy regulations.

#### Acceptance Criteria

1. THE Database SHALL encrypt customer phone numbers, customer names, and feedback text at rest using AES-256 encryption
2. THE Review_Rocket_App SHALL transmit all data over TLS 1.2 or higher
3. IF a Business Owner attempts to query records not associated with their own business_id, THEN THE Database SHALL reject the query and return an empty result set without revealing the existence of other records
4. THE Database SHALL maintain audit log entries for login events, SMS request events, and customer feedback events, where each entry includes a timestamp, actor identifier, event type, and affected resource identifier
5. THE Edge_Function SHALL exclude customer phone numbers, customer names, and feedback text from application logs
6. THE Database SHALL store all secrets and API keys in secure environment configuration and never in application source code
7. WHEN a Business Owner requests deletion of a customer record, THE Database SHALL remove the customer's phone number, name, and feedback text within 30 days and log the deletion event in the audit log

### Requirement 11: Performance and Reliability

**User Story:** As a business owner, I want the app to be fast and reliable, so that I can send review requests without delays or disruptions.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL complete initial launch and display the Dashboard within 2 seconds on a 4G LTE connection with at least 5 Mbps download speed and no greater than 100 milliseconds latency
2. THE Edge_Function SHALL return API responses within 500 milliseconds for single-record read and write operations, excluding SMS sending and bulk data retrieval
3. THE Review_Rocket_App SHALL cache the Send Request form data locally so that unsent requests survive app closure or network interruption, retaining cached data for up to 30 days and storing a maximum of 50 pending requests
4. IF a network request fails, THEN THE Review_Rocket_App SHALL retry the request up to 3 times with exponential backoff starting at 1 second and doubling each subsequent attempt before displaying an error message indicating the operation could not be completed
5. THE Review_Rocket_App SHALL display error boundary screens for unhandled exceptions instead of crashing, providing a "Restart" action that returns the user to the Dashboard
6. IF the SMS_Service is unavailable, THEN THE Edge_Function SHALL queue the SMS request and retry delivery every 5 minutes for a maximum of 24 hours before marking the request as failed and notifying the Business_Owner

### Requirement 12: Branding and Visual Design

**User Story:** As a business owner, I want a professional and visually appealing app, so that I feel confident using it for my business operations.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL use the primary color palette: Navy (#0B1736), Rocket Orange (#FF6B35), Success Green (#22C55E), White (#FFFFFF), Card Background (#F8FAFC), and Light Gray (#E5E7EB)
2. THE Review_Rocket_App SHALL apply NativeWind/Tailwind styling across all screens using a shared theme configuration that defines consistent spacing scale, border radius values, and shadow styles for all reusable components
3. WHILE a user-initiated action is in progress, THE Review_Rocket_App SHALL display a visible loading indicator within 200 milliseconds of action start; WHEN the action completes successfully, THE Review_Rocket_App SHALL display a success indicator using Success Green for at least 2 seconds; IF the action fails, THEN THE Review_Rocket_App SHALL display an error indicator using a distinct visual treatment that remains visible until the user dismisses it or retries the action
4. THE Review_Rocket_App SHALL render all screens without content overflow or overlapping elements on iOS devices from iPhone SE (375pt width) through iPhone 15 Pro Max (430pt width), including all intermediate screen sizes
5. THE Review_Rocket_App SHALL implement a typography hierarchy using no more than 3 distinct font sizes for headings, body text, and captions, with each level visually distinguishable by a minimum difference of 4pt in font size

### Requirement 13: Architecture and Maintainability

**User Story:** As a development team, I want clean architecture with minimal vendor coupling, so that the system can be migrated to AWS infrastructure in the future.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL implement service layer interfaces for authentication, database access, SMS sending, and push notifications such that no business logic module directly imports Supabase SDK packages
2. THE Review_Rocket_App SHALL implement repository pattern interfaces for all database access such that replacing the Supabase client with an alternative data source requires changes only within repository implementation files
3. THE Review_Rocket_App SHALL organize code into top-level directories separating features, shared components, services, types, and infrastructure adapters with no circular dependencies between feature directories
4. THE Edge_Function SHALL implement all backend logic through service interfaces such that no Supabase-specific API calls (e.g., supabase.from(), supabase.auth) appear outside dedicated adapter modules
5. THE Review_Rocket_App SHALL include unit tests covering all service interface implementations and integration tests validating end-to-end flows, with a minimum of 70% line coverage on business logic modules, configured to run in the Expo EAS CI/CD pipeline
6. THE Review_Rocket_App SHALL define TypeScript interfaces for each service abstraction (Auth, Database, SMS, Notifications) in a shared types directory, enabling alternate implementations without modifying consuming modules

### Requirement 14: Monitoring and Analytics

**User Story:** As a business owner and product team, I want application monitoring and usage analytics, so that issues are detected quickly and product decisions are data-informed.

#### Acceptance Criteria

1. THE Review_Rocket_App SHALL report unhandled exceptions and errors to Sentry with contextual metadata including screen name, anonymized user ID, device model, OS version, and network connectivity status, excluding sensitive customer data defined as customer phone numbers, customer names, and feedback text
2. THE Review_Rocket_App SHALL track user interaction events using PostHog analytics including screen views, button taps, and feature usage events defined as: review request sent, feedback received, customer called from inbox, feedback marked resolved, and subscription tier changed
3. WHEN an unhandled exception, HTTP 5xx response, or external service connection failure (Twilio or Database) occurs in the Edge_Function, THE Edge_Function SHALL log the error with severity level, request ID, timestamp, function name, and sanitized request parameters excluding customer phone numbers, customer names, and feedback text
4. THE Review_Rocket_App SHALL include the application version and build number in all error reports and analytics events
5. IF the Sentry or PostHog service is unreachable, THEN THE Review_Rocket_App SHALL buffer up to 100 unsent events locally and retry transmission when connectivity to the monitoring service is restored
