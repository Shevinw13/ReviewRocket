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
  dayCount: number;
  dayOverDayChange: number | null;
  // Per-period breakdowns
  weekPositive: number;
  weekNeedsAttention: number;
  weekResponseRate: number | null;
  dayPositive: number;
  dayNeedsAttention: number;
  dayResponseRate: number | null;
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
  // "This week" = last 7 days (rolling window, more useful than calendar week)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - 6);
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

      // In mock mode, return fixed marketing-ready metrics
      if (IS_MOCK_MODE) {
        return {
          // Month
          reviewOpportunities: 12,
          monthOverMonthChange: 18,
          positiveResponses: 9,
          needsAttention: 2,
          requestsSent: 12,
          responseRate: 92,
          // Week
          weekOverWeekChange: 25,
          weekCount: 12,
          weekPositive: 9,
          weekNeedsAttention: 2,
          weekResponseRate: 92,
          // Day
          dayCount: 5,
          dayOverDayChange: null,
          dayPositive: 4,
          dayNeedsAttention: 1,
          dayResponseRate: 83,
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
