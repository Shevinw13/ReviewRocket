# Requirements Document

## Introduction

This specification covers launch-ready refinements to the existing Nudgli app. The goal is to make small functional improvements across the Home Dashboard, Review Flow (SMS messaging), Inbox, and Settings screens — eliminating dead ends, improving metric clarity, refining SMS tone, and ensuring every interactive element performs a real action. The existing UI, branding, spacing, typography, colors, navigation, and overall experience remain unchanged.

## Glossary

- **Dashboard**: The home screen of the app displaying aggregated business metrics, a CTA to send review requests, and recent activity.
- **Metric_Card**: A compact visual card displaying a single numeric metric with a label and icon.
- **Review_Request**: An SMS sent to a customer asking them to rate their experience on a 1–5 scale.
- **Positive_Response**: A customer SMS reply containing a rating of 4 or 5.
- **Needs_Follow_Up_Item**: A customer SMS reply containing a rating of 1, 2, or 3 that requires business owner outreach.
- **Response_Rate**: The percentage of customers who replied to a review request out of total requests sent in the current month.
- **Inbox**: The screen listing feedback items from customers who rated 1–3, enabling the business owner to call or resolve.
- **Settings_Screen**: The screen providing access to business profile editing, subscription management, notifications, support, and app information.
- **Twilio_Webhook**: The Supabase Edge Function that processes inbound customer SMS replies and responds with TwiML.
- **Google_Review_Link**: The business's Google Review URL included in positive-response SMS messages.

## Requirements

### Requirement 1: Dashboard Top Card — Review Opportunities Created

**User Story:** As a business owner, I want to see how many review requests I sent this month compared to last month, so that I can track my outreach efforts.

#### Acceptance Criteria

1. THE Dashboard SHALL display a top card titled "Review Opportunities Created" showing the total count of review requests sent in the current calendar month.
2. THE Dashboard SHALL display a month-over-month percentage comparison on the top card indicating the change relative to the previous calendar month.
3. WHEN the previous calendar month had zero review requests, THE Dashboard SHALL display "N/A" for the month-over-month comparison.

### Requirement 2: Dashboard Metric Cards — Positive Responses

**User Story:** As a business owner, I want to see how many customers replied with a positive rating via SMS, so that I know how many happy customers I have.

#### Acceptance Criteria

1. THE Dashboard SHALL display a "Positive Responses" Metric_Card showing the count of customers who replied with a rating of 4 or 5 via SMS in the current month.
2. THE Dashboard SHALL display a clean outlined checkmark icon inside a subtle green circle on the Positive Responses Metric_Card.
3. THE Dashboard SHALL NOT count Google review submissions in the Positive Responses metric.

### Requirement 3: Dashboard Metric Cards — Needs Follow-up

**User Story:** As a business owner, I want to see how many customers need follow-up, so that I can prioritize outreach to dissatisfied customers.

#### Acceptance Criteria

1. THE Dashboard SHALL display a "Needs Follow-up" Metric_Card showing the count of customers who replied with a rating of 1, 2, or 3 via SMS in the current month.
2. THE Dashboard SHALL display a clean outlined alert/exclamation icon inside a soft amber circle on the Needs Follow-up Metric_Card.
3. WHEN a customer replies with a rating of 1, 2, or 3, THE Inbox SHALL automatically create a new Needs_Follow_Up_Item for that customer.

### Requirement 4: Dashboard Metric Cards — Response Rate

**User Story:** As a business owner, I want to see what percentage of my customers responded, so that I can evaluate the effectiveness of my outreach.

#### Acceptance Criteria

1. THE Dashboard SHALL display a "Response Rate" Metric_Card showing the percentage of customers who responded to a review request in the current month.
2. THE Dashboard SHALL calculate the Response_Rate as (total customers who replied / total review requests sent) × 100, rounded to the nearest whole number.
3. WHEN zero review requests have been sent in the current month, THE Dashboard SHALL display a dash ("—") for the Response Rate value.
4. THE Dashboard SHALL display a clean outlined analytics/trending icon inside a light blue circle on the Response Rate Metric_Card.

### Requirement 5: Dashboard Icon Styling

**User Story:** As a business owner, I want the dashboard to look polished and professional, so that I feel confident using the app.

#### Acceptance Criteria

1. THE Dashboard SHALL use clean outlined (non-filled) Ionicons icons for all three Metric_Cards.
2. THE Dashboard SHALL NOT display emoji-style or filled icons on Metric_Cards.
3. THE Dashboard SHALL render icon containers as circles with a subtle background tint matching the metric's semantic color (green for positive, amber for follow-up, blue for response rate).

### Requirement 6: SMS Positive Response Tone (Ratings 4–5)

**User Story:** As a business owner, I want my positive auto-reply to feel genuine and personal, so that customers are motivated to leave a Google review.

#### Acceptance Criteria

1. WHEN a customer replies with a rating of 4 or 5, THE Twilio_Webhook SHALL respond with a warm, appreciative message that thanks the customer and invites them to share their experience on Google.
2. THE Twilio_Webhook positive response SHALL include the business's Google_Review_Link.
3. THE Twilio_Webhook positive response SHALL convey that the customer's support helps the small business, using a conversational and genuine tone.

### Requirement 7: SMS Negative Response Tone (Ratings 1–3)

**User Story:** As a business owner, I want my negative auto-reply to acknowledge the customer's experience and promise follow-up, so that the customer feels heard.

#### Acceptance Criteria

1. WHEN a customer replies with a rating of 1, 2, or 3, THE Twilio_Webhook SHALL respond with a message that thanks the customer for their honesty and acknowledges the experience fell short.
2. THE Twilio_Webhook negative response SHALL NOT include a Google_Review_Link.
3. THE Twilio_Webhook negative response SHALL inform the customer that someone from the team will reach out shortly.
4. WHEN a customer replies with a rating of 1, 2, or 3, THE Twilio_Webhook SHALL NOT ask the customer for additional written feedback in the auto-reply.

### Requirement 8: Inbox — Auto-Created Items for Low Ratings

**User Story:** As a business owner, I want low-rating conversations to automatically appear in my inbox, so that I can follow up without manual tracking.

#### Acceptance Criteria

1. WHEN a customer replies with a rating of 1, 2, or 3, THE Inbox SHALL display an item containing the customer name, rating, service type, date, and any feedback text.
2. THE Inbox SHALL provide a "Call Customer" action that initiates a phone call to the customer's number using the device dialer.
3. THE Inbox SHALL provide a "Mark Resolved" action that marks the feedback item as resolved and removes it from the unresolved list.
4. THE Inbox SHALL NOT provide in-app text conversation or messaging functionality.

### Requirement 9: Settings — Business Information

**User Story:** As a business owner, I want to edit my business information from settings, so that I can keep my profile up to date.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "Business" row that navigates to an edit screen for business information.
2. WHEN the user taps the Business row, THE Settings_Screen SHALL navigate to a screen where the business name and Google review URL can be edited and saved.

### Requirement 10: Settings — User Profile

**User Story:** As a business owner, I want to edit my personal profile from settings, so that I can update my name and contact details.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "User Profile" row that navigates to an edit screen for the owner's profile.
2. WHEN the user taps the User Profile row, THE Settings_Screen SHALL navigate to a screen where first name, last name, and email can be viewed and updated.

### Requirement 11: Settings — Subscription Management

**User Story:** As a business owner, I want to manage my subscription from settings, so that I can upgrade or view my plan.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "Subscription" row that navigates to the subscription management screen.
2. WHEN the user taps the Subscription row, THE Settings_Screen SHALL navigate to the existing subscription screen showing tier, usage, and upgrade options.

### Requirement 12: Settings — Notifications Toggle

**User Story:** As a business owner, I want to enable or disable push notifications, so that I can control how I receive alerts.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "Notifications" row with a toggle or switch to enable/disable push notifications.
2. WHEN the user toggles notifications off, THE Settings_Screen SHALL disable push notification delivery for the device.
3. WHEN the user toggles notifications on, THE Settings_Screen SHALL request push notification permission and enable delivery.

### Requirement 13: Settings — App Version Display

**User Story:** As a business owner, I want to see what version of the app I'm running, so that I know if I'm up to date.

#### Acceptance Criteria

1. THE Settings_Screen SHALL display the current app version number sourced from the app's Expo configuration.

### Requirement 14: Settings — Support Contact

**User Story:** As a business owner, I want to contact support from settings, so that I can get help when I need it.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "Support" row displaying the email address support@nudgli.app.
2. WHEN the user taps the Support row, THE Settings_Screen SHALL open the device's default email application with support@nudgli.app pre-filled as the recipient.

### Requirement 15: Settings — Website Link

**User Story:** As a business owner, I want to visit the Nudgli website from settings, so that I can access additional resources.

#### Acceptance Criteria

1. THE Settings_Screen SHALL provide a "Website" row displaying the URL https://nudgli.app.
2. WHEN the user taps the Website row, THE Settings_Screen SHALL open the URL https://nudgli.app in the device's default browser.

### Requirement 16: No Dead Ends or Placeholder Functionality

**User Story:** As a business owner, I want every button and link in the app to perform a real action, so that the app feels complete and professional.

#### Acceptance Criteria

1. THE App SHALL ensure every interactive element (button, link, row) performs a navigation, action, or external launch when tapped.
2. THE App SHALL NOT display placeholder text, "coming soon" labels, or non-functional interactive elements.
3. IF an action cannot be performed due to an error, THEN THE App SHALL display an appropriate error message to the user.
