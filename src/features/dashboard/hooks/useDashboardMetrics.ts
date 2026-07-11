/**
 * Hook to fetch dashboard metrics for the current calendar month and week.
 * Provides both month-over-month and week-over-week comparison data.
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { calculateMonthOverMonth } from '@/utils/metrics';
import type { DashboardMetrics } from '@/types';

// ─── Mock Mode Detection ─────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const IS_MOCK_MODE =
  !SUPABASE_URL ||
  SUPABASE_URL === 'https://your-project-id.supabase.co' ||
  SUPABASE_URL === 'https://mock.supabase.co';

export interface DashboardMetricsWithWeek extends DashboardMetrics {
  weekOverWeekChange: number | null;
  weekCount: number;
}

function getMonthBoundaries() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { currentMonthStart, prevMonthStart, prevMonthEnd };
}

function getWeekBoundaries() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - dayOfWeek);
  currentWeekStart.setHours(0, 0, 0, 0);

  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const prevWeekEnd = new Date(currentWeekStart);
  prevWeekEnd.setMilliseconds(-1);

  return { currentWeekStart, prevWeekStart, prevWeekEnd };
}

export function useDashboardMetrics() {
  const reviewRequestRepo = useService('reviewRequests');
  const feedbackRepo = useService('feedback');
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useQuery<DashboardMetricsWithWeek>({
    queryKey: ['dashboard-metrics', businessId],
    queryFn: async () => {
      if (!businessId) {
        return {
          reviewOpportunities: 0,
          monthOverMonthChange: null,
          positiveResponses: 0,
          needsAttention: 0,
          requestsSent: 0,
          responseRate: null,
          weekOverWeekChange: null,
          weekCount: 0,
        };
      }

      // In mock mode, compute metrics from mock data for consistency
      if (IS_MOCK_MODE) {
        const { getMockActivityFeed } = require('@/infrastructure/mock/mock-services');
        const activityFeed: { type: string; rating?: number; createdAt: Date }[] = getMockActivityFeed();

        const now = new Date();
        const { currentMonthStart } = getMonthBoundaries();
        const { currentWeekStart } = getWeekBoundaries();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const allRatings = activityFeed.filter((item: any) => item.type === 'rating' && item.rating != null);
        const monthRatings = allRatings.filter((item: any) => new Date(item.createdAt) >= currentMonthStart);
        const weekRatings = allRatings.filter((item: any) => new Date(item.createdAt) >= currentWeekStart);
        const dayRatings = allRatings.filter((item: any) => new Date(item.createdAt) >= startOfDay);

        const monthPositive = monthRatings.filter((item: any) => item.rating >= 4).length;
        const monthNeedsAttention = monthRatings.filter((item: any) => item.rating <= 3).length;
        const monthTotal = monthRatings.length;
        const weekTotal = weekRatings.length;

        return {
          reviewOpportunities: monthTotal,
          monthOverMonthChange: 24,
          positiveResponses: monthPositive,
          needsAttention: monthNeedsAttention,
          requestsSent: monthTotal,
          responseRate: monthTotal > 0 ? Math.round((monthPositive / monthTotal) * 100) : null,
          weekOverWeekChange: 12,
          weekCount: weekTotal,
        };
      }

      const { currentMonthStart, prevMonthStart, prevMonthEnd } = getMonthBoundaries();
      const { currentWeekStart, prevWeekStart, prevWeekEnd } = getWeekBoundaries();

      // Fetch current month count
      const currentCountResult = await reviewRequestRepo.getMonthlyCount(businessId, currentMonthStart);
      const currentCount = currentCountResult.success ? currentCountResult.data : 0;

      // Fetch previous month count
      const prevCountResult = await reviewRequestRepo.getPreviousMonthCount(
        businessId,
        prevMonthStart,
        prevMonthEnd,
      );
      const prevCount = prevCountResult.success ? prevCountResult.data : 0;

      // Fetch current week count
      const weekCountResult = await reviewRequestRepo.getMonthlyCount(businessId, currentWeekStart);
      const weekCount = weekCountResult.success ? weekCountResult.data : 0;

      // Fetch previous week count
      const prevWeekCountResult = await reviewRequestRepo.getPreviousMonthCount(
        businessId,
        prevWeekStart,
        prevWeekEnd,
      );
      const prevWeekCount = prevWeekCountResult.success ? prevWeekCountResult.data : 0;

      // Calculate comparisons
      const monthOverMonthChange = calculateMonthOverMonth(currentCount, prevCount);
      const weekOverWeekChange = calculateMonthOverMonth(weekCount, prevWeekCount);

      // Get feedback records for positive/needs attention
      const feedbackResult = await feedbackRepo.getAll(businessId);
      const allFeedback = feedbackResult.success ? feedbackResult.data : [];

      const currentMonthFeedback = allFeedback.filter(
        (f) => new Date(f.createdAt) >= currentMonthStart,
      );

      const positiveResponses = currentMonthFeedback.filter((f) => f.rating >= 4).length;
      const needsAttention = currentMonthFeedback.filter((f) => f.rating <= 3).length;

      // Response rate
      const totalResponses = currentMonthFeedback.length;
      const responseRate = currentCount > 0
        ? Math.round((totalResponses / currentCount) * 100)
        : null;

      return {
        reviewOpportunities: currentCount,
        monthOverMonthChange,
        positiveResponses,
        needsAttention,
        requestsSent: currentCount,
        responseRate,
        weekOverWeekChange,
        weekCount,
      };
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });
}
