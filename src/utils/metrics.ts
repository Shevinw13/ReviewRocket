import type { ActivityItem, FeedbackRecord } from '../types/domain';

/**
 * Calculates the month-over-month percentage change.
 * Returns null if previousCount is 0 (cannot compute percentage from zero base).
 */
export function calculateMonthOverMonth(
  currentCount: number,
  previousCount: number
): number | null {
  if (previousCount === 0) {
    return null;
  }
  return Math.round(((currentCount - previousCount) / previousCount) * 100);
}

/**
 * Sorts activity items by createdAt descending (newest first) and
 * returns at most 10 items.
 */
export function sortAndLimitActivity(items: ActivityItem[]): ActivityItem[] {
  return [...items]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);
}

/**
 * Filters feedback records to only those with rating ≤ 3 AND isResolved is false,
 * sorted by createdAt descending (newest first).
 */
export function filterUnresolvedFeedback(
  records: FeedbackRecord[]
): FeedbackRecord[] {
  return records
    .filter((record) => record.rating <= 3 && !record.isResolved)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Classifies SMS quota usage status.
 * Returns 'exceeded' if used >= quota, 'warning' if used >= 80% of quota, 'ok' otherwise.
 */
export function classifySmsQuotaStatus(
  used: number,
  quota: number
): 'exceeded' | 'warning' | 'ok' {
  if (used >= quota) {
    return 'exceeded';
  }
  if (used >= 0.8 * quota) {
    return 'warning';
  }
  return 'ok';
}
