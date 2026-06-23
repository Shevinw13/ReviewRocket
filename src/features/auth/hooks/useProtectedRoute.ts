/**
 * Protected route hook.
 * Handles auth-based navigation:
 * - Unauthenticated users are redirected to /(auth)/login
 * - Authenticated users on auth screens are redirected to /(tabs)
 * - Handles refresh token expiry by navigating to login
 */

import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuthContext } from '@/features/auth/context/AuthContext';

/**
 * Protects routes based on authentication state.
 * Should be called in the root navigator component.
 *
 * Routing logic:
 * - If loading initial session: do nothing (show loading splash)
 * - If unauthenticated and NOT on auth screen: redirect to /(auth)/login
 * - If authenticated and ON auth screen: redirect to /(tabs)
 *
 * When the Supabase client's auto-refresh fails (refresh token expired),
 * onAuthStateChange fires with a null session, which triggers redirect to login.
 */
export function useProtectedRoute() {
  const { session, isLoading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Don't navigate until the navigation tree is ready
    if (!navigationState?.key) return;

    // Don't navigate while checking initial session
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthenticated = session !== null;

    if (!isAuthenticated && !inAuthGroup) {
      // Unauthenticated user trying to access protected route → redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Authenticated user on auth screen → redirect to main app (tabs)
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, navigationState?.key]);
}
