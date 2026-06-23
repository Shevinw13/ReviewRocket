/**
 * Hook to fetch unresolved feedback records enriched with customer names
 * from related review requests. Returns data sorted by most recent first.
 *
 * Requirements: 6.1, 6.2
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from './useBusinessProfile';
import type { FeedbackRecord } from '@/types';

export interface EnrichedFeedback extends FeedbackRecord {
  customerName: string;
  customerPhone?: string;
}

export function useUnresolvedFeedback() {
  const feedbackRepo = useService('feedback');
  const reviewRequestRepo = useService('reviewRequests');
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useQuery<EnrichedFeedback[]>({
    queryKey: ['unresolved-feedback', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const feedbackResult = await feedbackRepo.getUnresolved(businessId);
      if (!feedbackResult.success) {
        throw new Error(feedbackResult.error.message);
      }

      const feedbackRecords = feedbackResult.data;
      if (feedbackRecords.length === 0) return [];

      // Fetch related review requests to get customer names and phones
      const recentResult = await reviewRequestRepo.getRecentByBusiness(
        businessId,
        200, // fetch enough to cover all feedback
      );

      const reviewRequestMap = new Map<string, { customerName?: string; customerPhone: string }>();
      if (recentResult.success) {
        for (const rr of recentResult.data) {
          reviewRequestMap.set(rr.id, {
            customerName: rr.customerName,
            customerPhone: rr.customerPhone,
          });
        }
      }

      // Enrich feedback records with customer info
      return feedbackRecords.map((fb) => {
        const related = reviewRequestMap.get(fb.reviewRequestId);
        return {
          ...fb,
          customerName: related?.customerName || 'Customer',
          customerPhone: related?.customerPhone,
        };
      });
    },
    enabled: !!businessId,
    refetchInterval: 5000,
  });
}
