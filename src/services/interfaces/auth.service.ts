/**
 * Authentication service interface.
 * Abstracts auth operations so business logic never imports Supabase SDK directly.
 */

import type {
  Result,
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  Unsubscribe,
} from '@/types';

export interface IAuthService {
  signUp(params: SignUpParams): Promise<Result<AuthUser>>;
  signIn(params: SignInParams): Promise<Result<AuthSession>>;
  signOut(): Promise<Result<void>>;
  refreshSession(): Promise<Result<AuthSession>>;
  requestPasswordReset(email: string): Promise<Result<void>>;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): Unsubscribe;
}
