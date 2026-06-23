/**
 * Hook that syncs auth state to the monitoring service (Sentry).
 *
 * - When a user session is present, calls monitoringService.setUser with the user ID
 * - When session is null (logout / unauthenticated), calls monitoringService.clearUser
 *
 * Requirements: 14.1
 */

import { useEffect } from 'react';

import { useAuthContext } from '@/features/auth/context/AuthContext';
import { useService } from '@/services';

/**
 * Synchronizes the current authenticated user with the monitoring service.
 * Must be rendered inside both AuthProvider and ServiceProvider.
 */
export function useSentryUserSync(): void {
  const { session } = useAuthContext();
  const monitoringService = useService('monitoring');

  useEffect(() => {
    if (session?.user?.id) {
      monitoringService.setUser(session.user.id);
    } else {
      monitoringService.clearUser();
    }
  }, [session, monitoringService]);
}
