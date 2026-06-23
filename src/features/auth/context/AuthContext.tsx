/**
 * Auth context provider.
 * Makes auth state available to the entire component tree without prop drilling.
 * Used by the root layout to drive auth-based routing.
 */

import React, { createContext, useContext } from 'react';
import type { AuthState } from '@/features/auth/hooks/useAuth';

const AuthContext = createContext<AuthState | null>(null);

export interface AuthProviderProps {
  value: AuthState;
  children: React.ReactNode;
}

export function AuthProvider({ value, children }: AuthProviderProps) {
  return React.createElement(AuthContext.Provider, { value }, children);
}

/**
 * Access auth state from any component in the tree.
 * Must be used within an AuthProvider.
 */
export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
