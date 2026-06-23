/**
 * Auth feature barrel exports.
 */

export { useAuth } from './hooks/useAuth';
export type { AuthState } from './hooks/useAuth';
export { useProtectedRoute } from './hooks/useProtectedRoute';
export { AuthProvider, useAuthContext } from './context/AuthContext';
