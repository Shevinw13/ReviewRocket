/**
 * Hook to fetch all feedback records (including resolved) enriched with
 * customer names from related review requests. Sorted by most recent first.
 * Decrypts customer names and feedback text via the decrypt-data Edge Function.
 *
 * Requirements: 6.6
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from './useBusinessProfile';
import { decryptFields } from '@/utils/decrypt';
import type { FeedbackRecord } from '@/types';

export interface EnrichedFeedback extends FeedbackRecord {
  customerName: string;
  customerPhone?: string;
  serviceType?: string;
}

export function useAllFeedback() {
  const feedbackRepo = useService('feedback');
  const reviewRequestRepo = useService('reviewRequests');
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useQuery<EnrichedFeedback[]>({
    queryKey: ['all-feedback', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const feedbackResult = await feedbackRepo.getAll(businessId);
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

      const reviewRequestMap = new Map<string, { customerName?: string; customerPhone: string; serviceType?: string }>();
      if (recentResult.success) {
        for (const rr of recentResult.data) {
          reviewRequestMap.set(rr.id, {
            customerName: rr.customerName,
            customerPhone: rr.customerPhone,
            serviceType: rr.serviceType,
          });
        }
      }

      // Collect all encrypted values that need decryption
      const fieldsToDecrypt: Array<{ ciphertext: string; fieldType: 'customer_name' | 'customer_phone' | 'feedback_text' }> = [];

      for (const fb of feedbackRecords) {
        if (fb.feedbackText) {
          fieldsToDecrypt.push({ ciphertext: fb.feedbackText, fieldType: 'feedback_text' });
        }
      }
      for (const rr of reviewRequestMap.values()) {
        if (rr.customerName) {
          fieldsToDecrypt.push({ ciphertext: rr.customerName, fieldType: 'customer_name' });
        }
        if (rr.customerPhone) {
          fieldsToDecrypt.push({ ciphertext: rr.customerPhone, fieldType: 'customer_phone' });
        }
      }

      // Batch decrypt all fields
      const decrypted = await decryptFields(businessId, fieldsToDecrypt);

      // Enrich feedback records with decrypted customer info
      return feedbackRecords.map((fb) => {
        const related = reviewRequestMap.get(fb.reviewRequestId);
        const decryptedName = related?.customerName ? decrypted.get(related.customerName) : undefined;
        const decryptedPhone = related?.customerPhone ? decrypted.get(related.customerPhone) : undefined;
        const decryptedFeedback = fb.feedbackText ? decrypted.get(fb.feedbackText) : undefined;

        return {
          ...fb,
          feedbackText: decryptedFeedback || fb.feedbackText,
          customerName: decryptedName || related?.customerName || 'Customer',
          customerPhone: decryptedPhone || related?.customerPhone,
          serviceType: related?.serviceType,
        };
      });
    },
    enabled: !!businessId,
  });
}
