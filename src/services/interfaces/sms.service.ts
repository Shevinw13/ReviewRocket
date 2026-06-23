/**
 * SMS service interface.
 * Abstracts SMS sending so business logic is decoupled from Twilio.
 */

import type { Result, SendSmsParams, SmsDeliveryResult } from '@/types';

export interface ISmsService {
  sendFeedbackRequest(params: SendSmsParams): Promise<Result<SmsDeliveryResult>>;
}
