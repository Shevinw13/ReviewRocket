/**
 * Hook to fetch the current business owner's profile.
 * Uses the auth session's user ID to look up the BusinessProfile
 * via IBusinessProfileRepository.getByOwnerId.
 *
 * This provides the businessId needed by other inbox hooks.
 */

import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import type { BusinessProfile } from '@/types';

export function useBusinessProfile() {
  const businessProfileRepo = useService('businessProfile');
  const { session } = useAuthContext();
  const userId = session?.user?.id;

  return useQuery<BusinessProfile | null>({
    queryKey: ['business-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const result = await businessProfileRepo.getByOwnerId(userId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!userId,
    staleTime: 60_000, // Profile doesn't change often — 1 minute stale time
  });
}
