/**
 * Hook to fetch the 10 most recent customer ratings for the activity feed.
 * Results are sorted newest to oldest.
 *
 * Requirements: 5.6, 5.8
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { sortAndLimitActivity } from '@/utils/metrics';
import type { ActivityItem } from '@/types';

export function useRecentActivity() {
  const reviewRequestRepo = useService('reviewRequests');
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useQuery<ActivityItem[]>({
    queryKey: ['recent-activity', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      // Get recent review requests that have ratings
      const result = await reviewRequestRepo.getRecentByBusiness(businessId, 20);
      if (!result.success) {
        throw new Error(result.error.message);
      }

      // Map to ActivityItems — only include those with ratings
      const items: ActivityItem[] = result.data
        .filter((r) => r.rating != null)
        .map((r) => ({
          id: r.id,
          customerName: r.customerName,
          rating: r.rating!,
          createdAt: r.feedbackReceivedAt ?? r.createdAt,
        }));

      return sortAndLimitActivity(items);
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });
}

