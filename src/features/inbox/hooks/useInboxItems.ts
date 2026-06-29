/**
 * Hook to fetch active (non-dismissed) inbox items for the business
 * and expose a dismiss mutation that removes items from the active view.
 *
 * Requirements: 2.1, 2.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useService } from '@/services';
import { useBusinessProfile } from './useBusinessProfile';
import type { InboxItem } from '@/types';

export function useInboxItems() {
  const inboxItemsRepo = useService('inboxItems');
  const queryClient = useQueryClient();
  const { data: profile } = useBusinessProfile();
  const businessId = profile?.id;

  const query = useQuery<InboxItem[]>({
    queryKey: ['inbox-items', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const result = await inboxItemsRepo.getActive(businessId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!businessId,
  });

  const dismissMutation = useMutation<void, Error, string>({
    mutationFn: async (itemId: string) => {
      const result = await inboxItemsRepo.dismiss(itemId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-items'] });
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    dismiss: dismissMutation.mutate,
    isDismissing: dismissMutation.isPending,
  };
}
