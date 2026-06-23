/**
 * Auth state management hook.
 * Subscribes to auth state changes via the auth service interface,
 * tracks current session state, and provides loading/session info
 * for auth-based routing decisions.
 */

import { useEffect, useState, useCallback } from 'react';
import type { AuthSession } from '@/types';
import type { IAuthService } from '@/services/interfaces/auth.service';

export interface AuthState {
  /** Current auth session, null if unauthenticated */
  session: AuthSession | null;
  /** True while checking initial session on app start */
  isLoading: boolean;
  /** Signs out and clears session */
  signOut: () => Promise<void>;
}

/**
 * Manages auth state by subscribing to the auth service's onAuthStateChange.
 * Handles:
 * - Initial session check on mount
 * - Subscribing to auth state changes (login, logout, token refresh)
 * - Providing a signOut function that clears session
 *
 * Note: Auto-refresh is handled by the Supabase client (autoRefreshToken: true).
 * When a refresh token expires, onAuthStateChange fires with a null session,
 * which this hook picks up and surfaces as an unauthenticated state.
 */
export function useAuth(authService: IAuthService): AuthState {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    let mounted = true;

    async function loadInitialSession() {
      try {
        const existingSession = await authService.getSession();
        if (mounted) {
          setSession(existingSession);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialSession();

    // Subscribe to auth state changes (sign in, sign out, token refresh, token expired)
    const unsubscribe = authService.onAuthStateChange((newSession) => {
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [authService]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
  }, [authService]);

  return { session, isLoading, signOut };
}
