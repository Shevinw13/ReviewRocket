/**
 * React Query mutation hook for sending SMS review requests.
 *
 * Calls the send-sms Edge Function via ISmsService with exponential backoff
 * retry for network resilience. On success, invalidates dashboard metrics
 * and recent activity queries to keep the UI fresh.
 *
 * Requirements: 3.1, 3.5, 11.4
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { withRetry } from '@/utils/retry';
import type { SendRequestFormData, SmsDeliveryResult } from '@/types';

export function useSendReviewRequest() {
  const smsService = useService('sms');
  const queryClient = useQueryClient();
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useMutation<SmsDeliveryResult, Error, SendRequestFormData>({
    mutationFn: async (params: SendRequestFormData) => {
      if (!businessId) {
        throw new Error('Business profile not loaded. Please try again.');
      }

      const result = await withRetry(() =>
        smsService.sendFeedbackRequest({
          phoneNumber: params.phoneNumber,
          customerName: params.customerName || undefined,
          serviceType: params.serviceType || undefined,
          businessId,
        })
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-count'] });
    },
  });
}
