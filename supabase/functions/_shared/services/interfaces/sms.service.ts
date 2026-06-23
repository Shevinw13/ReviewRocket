/**
 * SMS service interface for Edge Functions.
 * Abstracts SMS operations so business logic is decoupled from Twilio.
 */

import type { Result, SendSmsPayload } from "../../types/index.ts";

/** Result of sending an SMS. */
export interface SmsDeliveryResult {
  messageSid: string;
  status: "sent" | "queued";
}

/** TwiML response string for webhook replies. */
export type TwiMLResponse = string;

export interface ISmsService {
  /** Send an SMS message via Twilio. */
  sendSms(params: SendSmsPayload): Promise<Result<SmsDeliveryResult>>;

  /** Build a TwiML response containing a positive feedback reply with the Google Review URL. */
  buildPositiveResponse(googleReviewUrl: string): TwiMLResponse;

  /** Build a TwiML response asking for more details after a negative rating. */
  buildNegativeResponse(): TwiMLResponse;

  /** Build a TwiML response thanking the customer for their written feedback. */
  buildThankYouResponse(): TwiMLResponse;

  /** Build a TwiML response asking the customer to reply with a valid rating (1-5). */
  buildRetryPromptResponse(): TwiMLResponse;

  /** Build a TwiML response indicating the conversation has ended after too many invalid replies. */
  buildConversationEndedResponse(): TwiMLResponse;

  /** Build an empty TwiML response (no reply). */
  buildEmptyResponse(): TwiMLResponse;
}
