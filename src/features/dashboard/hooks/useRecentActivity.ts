/**
 * Hook to fetch the 10 most recent activity items for the activity feed.
 * Supports mixed types: ratings, SMS opt-out, and SMS opt-in entries.
 * Results are sorted newest to oldest.
 *
 * Requirements: 3.1, 3.3, 3.4, 5.3, 5.6, 5.8
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { sortAndLimitActivity } from '@/utils/metrics';
import { getMockActivityFeed } from '@/infrastructure/mock/mock-services';
import type { ActivityItem } from '@/types';

// ─── Mock Mode Detection ─────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const IS_MOCK_MODE =
  !SUPABASE_URL ||
  SUPABASE_URL === 'https://your-project-id.supabase.co' ||
  SUPABASE_URL === 'https://mock.supabase.co';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRecentActivity() {
  const reviewRequestRepo = useService('reviewRequests');
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useQuery<ActivityItem[]>({
    queryKey: ['recent-activity', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      // In mock mode, return mock activity feed data with opt-out/opt-in entries
      if (IS_MOCK_MODE) {
        return sortAndLimitActivity(getMockActivityFeed());
      }

      // In real mode, get recent review requests that have ratings
      const result = await reviewRequestRepo.getRecentByBusiness(businessId, 20);
      if (!result.success) {
        throw new Error(result.error.message);
      }

      // Map to ActivityItems — only include those with ratings
      const items: ActivityItem[] = result.data
        .filter((r) => r.rating != null)
        .map((r) => ({
          id: r.id,
          type: 'rating' as const,
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
