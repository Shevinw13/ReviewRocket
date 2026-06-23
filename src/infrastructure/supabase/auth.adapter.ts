/**
 * Supabase authentication adapter implementing IAuthService.
 * Wraps Supabase Auth calls and maps responses to the application's Result<T> type.
 */

import type { IAuthService } from '@/services/interfaces/auth.service';
import type {
  Result,
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  Unsubscribe,
} from '@/types';
import { ErrorCode } from '@/types';
import { supabase } from './client';

/**
 * Maps a Supabase auth error to an appropriate ErrorCode.
 */
function mapAuthError(error: { message: string; status?: number }): ErrorCode {
  const message = error.message.toLowerCase();

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return ErrorCode.RATE_LIMIT;
  }
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return ErrorCode.AUTH_ERROR;
  }
  if (message.includes('email not confirmed') || message.includes('not confirmed')) {
    return ErrorCode.AUTH_ERROR;
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return ErrorCode.CONFLICT;
  }
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (error.status && error.status >= 500) {
    return ErrorCode.SERVER_ERROR;
  }

  return ErrorCode.AUTH_ERROR;
}

export class SupabaseAuthAdapter implements IAuthService {
  /**
   * Creates a new user account with email/password and user metadata.
   * Passes firstName, lastName, businessName, and googleReviewUrl as user metadata.
   */
  async signUp(params: SignUpParams): Promise<Result<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            firstName: params.firstName,
            lastName: params.lastName,
            businessName: params.businessName,
            googleReviewUrl: params.googleReviewUrl,
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: {
            code: mapAuthError(error),
            message: error.message,
            details: error,
          },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: {
            code: ErrorCode.AUTH_ERROR,
            message: 'Signup succeeded but no user was returned',
          },
        };
      }

      return {
        success: true,
        data: {
          id: data.user.id,
          email: data.user.email ?? '',
          emailVerified: !!data.user.email_confirmed_at,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred during signup',
          details: err,
        },
      };
    }
  }

  /**
   * Signs in a user with email and password.
   * Returns a session containing JWT access token (1h expiry) and refresh token (7d expiry).
   */
  async signIn(params: SignInParams): Promise<Result<AuthSession>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (error) {
        return {
          success: false,
          error: {
            code: mapAuthError(error),
            message: error.message,
            details: error,
          },
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            code: ErrorCode.AUTH_ERROR,
            message: 'Sign in succeeded but no session was returned',
          },
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email ?? '',
            emailVerified: !!data.user.email_confirmed_at,
          },
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at ?? 0,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred during sign in',
          details: err,
        },
      };
    }
  }

  /**
   * Signs out the current user and invalidates their session tokens.
   */
  async signOut(): Promise<Result<void>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: {
            code: mapAuthError(error),
            message: error.message,
            details: error,
          },
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred during sign out',
          details: err,
        },
      };
    }
  }

  /**
   * Refreshes the current session using the stored refresh token.
   * Supabase handles token rotation automatically — the old refresh token is invalidated.
   */
  async refreshSession(): Promise<Result<AuthSession>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return {
          success: false,
          error: {
            code: mapAuthError(error),
            message: error.message,
            details: error,
          },
        };
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            code: ErrorCode.AUTH_ERROR,
            message: 'Session refresh succeeded but no session was returned',
          },
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: data.user!.id,
            email: data.user!.email ?? '',
            emailVerified: !!data.user!.email_confirmed_at,
          },
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at ?? 0,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred during session refresh',
          details: err,
        },
      };
    }
  }

  /**
   * Sends a single-use password reset link to the given email.
   * The link expires after 60 minutes (configured in Supabase dashboard).
   */
  async requestPasswordReset(email: string): Promise<Result<void>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return {
          success: false,
          error: {
            code: mapAuthError(error),
            message: error.message,
            details: error,
          },
        };
      }

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred during password reset request',
          details: err,
        },
      };
    }
  }

  /**
   * Returns the current active session or null if no session exists.
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        return null;
      }

      return {
        user: {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          emailVerified: !!data.session.user.email_confirmed_at,
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Subscribes to auth state changes (sign in, sign out, token refresh).
   * Returns an unsubscribe function to clean up the listener.
   */
  onAuthStateChange(callback: (session: AuthSession | null) => void): Unsubscribe {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        callback(null);
        return;
      }

      callback({
        user: {
          id: session.user.id,
          email: session.user.email ?? '',
          emailVerified: !!session.user.email_confirmed_at,
        },
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ?? 0,
      });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }
}
