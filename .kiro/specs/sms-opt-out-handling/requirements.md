# Requirements Document

## Introduction

This feature adds SMS opt-out handling to the Nudgli app. When a customer opts out of SMS messaging (by replying STOP, UNSUBSCRIBE, or CANCEL — handled automatically at the carrier level by Twilio), the app must track that opt-out status, inform the business owner through the Inbox and Activity Feed, and prevent future SMS sends to opted-out phone numbers. This ensures compliance with telecommunications regulations and respects customer communication preferences.

## Glossary

- **Opt_Out_Handler**: The backend system (Twilio webhook + Supabase) responsible for receiving and storing SMS opt-out notifications from Twilio.
- **Inbox_System**: The in-app Inbox tab that displays actionable items for the business owner, including opt-out notifications.
- **Activity_Feed**: The Recent Activity section on the Dashboard that shows a chronological history of meaningful customer interactions.
- **Send_Request_Flow**: The screen and logic that handles sending new SMS review requests to customers.
- **Opt_Out_Record**: A database record indicating that a specific phone number has opted out of receiving SMS messages from a business.
- **Business_Owner**: The authenticated user who operates a business and sends review requests through Nudgli.

## Requirements

### Requirement 1: Store Opt-Out Status from Twilio Webhook

**User Story:** As a business owner, I want the system to automatically record when a customer opts out of SMS, so that their preference is respected without manual intervention.

#### Acceptance Criteria

1. WHEN the Twilio webhook receives an opt-out notification for a phone number, THE Opt_Out_Handler SHALL create an Opt_Out_Record associating that phone number with the corresponding business.
2. THE Opt_Out_Handler SHALL store the opt-out timestamp, the phone number hash, and the business identifier in the Opt_Out_Record.
3. WHEN an Opt_Out_Record already exists for a phone number and business combination, THE Opt_Out_Handler SHALL not create a duplicate record.
4. IF the Twilio webhook receives a malformed or incomplete opt-out notification, THEN THE Opt_Out_Handler SHALL log the error and return a successful HTTP response to Twilio without creating a record.

### Requirement 2: Create Inbox Item on Opt-Out

**User Story:** As a business owner, I want to see a notification in my Inbox when a customer opts out, so that I am aware of the change in their communication preference.

#### Acceptance Criteria

1. WHEN an Opt_Out_Record is created for a customer, THE Inbox_System SHALL automatically create an inbox item with the title "Customer Opted Out".
2. THE Inbox_System SHALL display the inbox item body as: "{Name} has chosen to stop receiving SMS messages from your business. Future review requests cannot be sent to this phone number unless they opt back in." where {Name} is the customer name if available, or the formatted phone number if no name is on file.
3. THE Inbox_System SHALL display a single "Dismiss" action button on the opt-out inbox item.
4. WHEN the Business_Owner taps "Dismiss", THE Inbox_System SHALL remove the inbox item from the active view.
5. THE Inbox_System SHALL style the opt-out inbox item using an informational appearance consistent with the existing design language, not an error appearance.

### Requirement 3: Record Opt-Out in Activity Feed

**User Story:** As a business owner, I want opt-out events to appear in my Recent Activity feed, so that I have a complete history of meaningful customer interactions.

#### Acceptance Criteria

1. WHEN an Opt_Out_Record is created, THE Activity_Feed SHALL add an entry displaying "{Name} opted out of SMS messaging" where {Name} is the customer name if available, or the formatted phone number.
2. THE Activity_Feed SHALL display the opt-out entry with a timestamp indicating when the opt-out occurred.
3. THE Activity_Feed SHALL style the opt-out entry using a subtle informational icon and color, distinct from rating-based activity items.
4. THE Activity_Feed SHALL include opt-out entries in chronological order alongside other activity items.

### Requirement 4: Prevent Sending to Opted-Out Numbers

**User Story:** As a business owner, I want the app to prevent me from sending review requests to customers who have opted out, so that I respect their preferences and avoid compliance issues.

#### Acceptance Criteria

1. WHEN the Business_Owner attempts to send a review request to a phone number with an active Opt_Out_Record, THE Send_Request_Flow SHALL prevent the SMS from being sent.
2. WHEN a send attempt is blocked due to opt-out status, THE Send_Request_Flow SHALL display a dialog with the title "Unable to Send Request" and the body: "This customer has opted out of receiving SMS messages. To respect their communication preferences, Nudgli cannot send additional review requests unless they opt back in."
3. THE Send_Request_Flow SHALL display a single "OK" button on the opt-out prevention dialog to dismiss it.
4. THE Send_Request_Flow SHALL check opt-out status before deducting from the business owner's SMS quota.
5. THE Send_Request_Flow SHALL perform the opt-out check using the normalized phone number to ensure consistent matching regardless of input format.

### Requirement 5: Support Opt-Back-In

**User Story:** As a business owner, I want the system to recognize when a customer opts back in to SMS, so that I can resume sending them review requests.

#### Acceptance Criteria

1. WHEN the Twilio webhook receives an opt-in notification (e.g., customer texts START) for a phone number with an active Opt_Out_Record, THE Opt_Out_Handler SHALL mark the Opt_Out_Record as inactive.
2. WHEN an Opt_Out_Record is marked inactive, THE Send_Request_Flow SHALL allow sending review requests to that phone number.
3. WHEN a customer opts back in, THE Activity_Feed SHALL add an entry displaying "{Name} opted back in to SMS messaging".
