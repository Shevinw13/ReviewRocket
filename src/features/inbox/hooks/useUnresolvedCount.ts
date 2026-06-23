/**
 * Hook to fetch the count of unresolved feedback records.
 * Polls every 5 seconds to keep the Inbox tab badge updated
 * within 5 seconds of new feedback arrival.
 *
 * Requirements: 9.5
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from './useBusinessProfile';

export function useUnresolvedCount() {
  const feedbackRepo = useService('feedback');
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useQuery<number>({
    queryKey: ['unresolved-count', businessId],
    queryFn: async () => {
      if (!businessId) return 0;
      const result = await feedbackRepo.getUnresolvedCount(businessId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!businessId,
    refetchInterval: 5000, // Poll every 5 seconds to meet the 5-second update requirement
  });
}
