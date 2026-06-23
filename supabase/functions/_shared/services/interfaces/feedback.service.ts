/**
 * Feedback service interface for Edge Functions.
 * Manages conversation state for inbound SMS webhook processing.
 */

import type { ActiveConversation, Result } from "../../types/index.ts";
import type { TwiMLResponse } from "./sms.service.ts";

export interface IFeedbackService {
  /** Get the active conversation for a customer phone number. Returns null if none exists. */
  getActiveConversation(
    customerPhone: string,
  ): Promise<Result<ActiveConversation | null>>;

  /** Record a customer's rating and transition conversation state. */
  recordRating(conversationId: string, rating: number): Promise<Result<void>>;

  /** Record written feedback text from the customer. */
  recordFeedbackText(
    conversationId: string,
    text: string,
  ): Promise<Result<void>>;

  /** Handle an invalid response: increment counter and return appropriate TwiML response. */
  handleInvalidResponse(
    conversation: ActiveConversation,
  ): Promise<Result<TwiMLResponse>>;

  /** Create a new active conversation when a feedback SMS is sent. */
  createConversation(params: {
    reviewRequestId: string;
    businessId: string;
    customerPhone: string;
    customerName?: string;
    googleReviewUrl: string;
  }): Promise<Result<ActiveConversation>>;
}
