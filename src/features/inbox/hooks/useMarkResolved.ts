/**
 * Mutation hook to mark a feedback record as resolved.
 * Implements optimistic update to immediately remove the item from the
 * unresolved feedback list. On error, rolls back the optimistic change.
 * On success, invalidates unresolved-feedback, all-feedback, and unresolved-count queries.
 *
 * Requirements: 6.4
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from './useBusinessProfile';
import type { FeedbackRecord } from '@/types';

export function useMarkResolved() {
  const feedbackRepo = useService('feedback');
  const queryClient = useQueryClient();
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  return useMutation<FeedbackRecord, Error, string, { previousUnresolved: FeedbackRecord[] | undefined }>({
    mutationFn: async (feedbackId: string) => {
      const result = await feedbackRepo.markResolved(feedbackId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onMutate: async (feedbackId: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['unresolved-feedback', businessId] });

      // Snapshot the previous value for rollback
      const previousUnresolved = queryClient.getQueryData<FeedbackRecord[]>([
        'unresolved-feedback',
        businessId,
      ]);

      // Optimistically remove the item from the unresolved list
      queryClient.setQueryData<FeedbackRecord[]>(
        ['unresolved-feedback', businessId],
        (old) => old?.filter((item) => item.id !== feedbackId) ?? [],
      );

      return { previousUnresolved };
    },
    onError: (_error, _feedbackId, context) => {
      // Rollback the optimistic update on error
      if (context?.previousUnresolved) {
        queryClient.setQueryData(
          ['unresolved-feedback', businessId],
          context.previousUnresolved,
        );
      }
    },
    onSuccess: () => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['unresolved-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-count'] });
    },
  });
}
