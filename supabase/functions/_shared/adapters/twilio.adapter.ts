/**
 * Twilio adapter for Edge Functions.
 * Makes direct HTTP requests to the Twilio REST API (no SDK needed in Deno).
 * All Twilio-specific logic is isolated to this module (Requirement 13.4).
 */

import type { Result, SendSmsPayload } from "../types/index.ts";
import { ErrorCode } from "../types/index.ts";
import type {
  ISmsService,
  SmsDeliveryResult,
  TwiMLResponse,
} from "../services/interfaces/sms.service.ts";

/** Twilio configuration read from environment variables. */
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getTwilioConfig(): TwilioConfig {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "Missing Twilio environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER",
    );
  }

  return { accountSid, authToken, fromNumber };
}

/**
 * Send an SMS message via the Twilio REST API.
 */
export async function sendSms(
  params: SendSmsPayload,
): Promise<Result<SmsDeliveryResult>> {
  const config = getTwilioConfig();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: params.to,
    From: config.fromNumber,
    Body: params.body,
  });

  const credentials = btoa(`${config.accountSid}:${config.authToken}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: ErrorCode.SERVER_ERROR,
          message: `Twilio API error: ${response.status} ${response.statusText}`,
          details: errorData,
        },
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        messageSid: data.sid,
        status: data.status === "queued" ? "queued" : "sent",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: `Failed to send SMS: ${(err as Error).message}`,
        details: err,
      },
    };
  }
}

/**
 * Build a TwiML response containing the Google Review URL for positive ratings.
 */
export function buildPositiveResponse(googleReviewUrl: string): TwiMLResponse {
  const message =
    `Thanks so much — that really means a lot to us! If you have a moment, we'd love for you to share your experience on Google. It makes a huge difference for our small business: ${googleReviewUrl}`;
  return buildTwiMLMessage(message);
}

/**
 * Build a TwiML response acknowledging a negative rating with empathy.
 * Does not solicit additional written feedback — a team member will follow up directly.
 */
export function buildNegativeResponse(): TwiMLResponse {
  const message =
    "Thank you for your honesty \u2014 we're sorry your experience didn't meet expectations. Someone from our team will reach out to you shortly to make things right.";
  return buildTwiMLMessage(message);
}

/**
 * Build a TwiML response thanking the customer for written feedback.
 */
export function buildThankYouResponse(): TwiMLResponse {
  const message =
    "Thank you for sharing your feedback. We take all input seriously and will work to improve. We appreciate you taking the time to let us know.";
  return buildTwiMLMessage(message);
}

/**
 * Build a TwiML response asking for a valid rating.
 */
export function buildRetryPromptResponse(): TwiMLResponse {
  const message =
    "We didn't quite catch that. Please reply with a number from 1 to 5 to rate your experience.";
  return buildTwiMLMessage(message);
}

/**
 * Build a TwiML response indicating the conversation has ended.
 */
export function buildConversationEndedResponse(): TwiMLResponse {
  const message =
    "We appreciate you taking the time to respond. If you'd like to share feedback in the future, feel free to reach out. Have a great day!";
  return buildTwiMLMessage(message);
}

/**
 * Build an empty TwiML response (no reply sent).
 */
export function buildEmptyResponse(): TwiMLResponse {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}

/**
 * Helper to wrap a message in TwiML format.
 */
function buildTwiMLMessage(message: string): TwiMLResponse {
  // Escape XML special characters
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

/**
 * Create the full ISmsService implementation for use in Edge Functions.
 */
export function createTwilioSmsService(): ISmsService {
  return {
    sendSms,
    buildPositiveResponse,
    buildNegativeResponse,
    buildThankYouResponse,
    buildRetryPromptResponse,
    buildConversationEndedResponse,
    buildEmptyResponse,
  };
}
