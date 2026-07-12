/**
 * Hook to compute rating trend data from recent activity.
 * Returns one data point per individual rating within the selected period,
 * sorted oldest to newest, plus the overall average.
 */

import { useMemo } from 'react';

import type { ActivityItem } from '@/types';
import type { ComparisonPeriod } from '../components/DashboardMetrics';
import type { RatingDataPoint } from '../components/RatingTrendChart';

interface RatingTrendResult {
  data: RatingDataPoint[];
  overallAverage: number | null;
  totalRatings: number;
}

export function useRatingTrend(
  activity: ActivityItem[] | undefined,
  period: ComparisonPeriod,
): RatingTrendResult {
  return useMemo(() => {
    if (!activity || activity.length === 0) {
      return { data: [], overallAverage: null, totalRatings: 0 };
    }

    const now = new Date();
    let startDate: Date;

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filter to ratings only within the period
    const ratings = activity.filter(
      (item) =>
        item.type === 'rating' &&
        item.rating != null &&
        new Date(item.createdAt) >= startDate,
    );

    if (ratings.length === 0) {
      return { data: [], overallAverage: null, totalRatings: 0 };
    }

    // Calculate overall average
    const totalRatings = ratings.length;
    const sum = ratings.reduce((acc, item) => acc + (item.rating ?? 0), 0);
    const overallAverage = sum / totalRatings;

    // One data point per rating, sorted oldest first
    const data: RatingDataPoint[] = ratings
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((item) => ({
        date: new Date(item.createdAt),
        averageRating: item.rating!,
        count: 1,
        customerName: item.customerName,
      }));

    return { data, overallAverage, totalRatings };
  }, [activity, period]);
}
