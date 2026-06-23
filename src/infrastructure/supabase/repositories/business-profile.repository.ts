/**
 * Supabase repository adapter for BusinessProfile operations.
 * Implements IBusinessProfileRepository using the Supabase client.
 * Maps snake_case database rows to camelCase domain objects and wraps
 * all operations in Result<T> with appropriate error codes.
 */

import type { IBusinessProfileRepository } from '@/services/interfaces/database.service';
import type { Result, BusinessProfile, SubscriptionTier } from '@/types';
import { ErrorCode, TIER_QUOTAS } from '@/types';
import { supabase } from '../client';

/** Raw row shape returned from the business_owners table. */
interface BusinessOwnerRow {
  id: string;
  auth_user_id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  google_review_url: string;
  subscription_tier: SubscriptionTier;
  sms_used_this_period: number;
  billing_period_start: string;
  created_at: string;
  updated_at: string;
}

/**
 * Maps a Supabase database error to the appropriate ErrorCode.
 */
function mapDbError(error: { message: string; code?: string; details?: string }): ErrorCode {
  const message = error.message.toLowerCase();
  const code = error.code ?? '';

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (code === 'PGRST116' || message.includes('not found') || message.includes('no rows')) {
    return ErrorCode.NOT_FOUND;
  }
  if (code === '23505' || message.includes('duplicate') || message.includes('already exists')) {
    return ErrorCode.CONFLICT;
  }
  if (message.includes('permission') || message.includes('policy')) {
    return ErrorCode.AUTH_ERROR;
  }
  if (message.includes('invalid') || message.includes('validation')) {
    return ErrorCode.VALIDATION_ERROR;
  }

  return ErrorCode.SERVER_ERROR;
}

/**
 * Maps a snake_case database row to a camelCase BusinessProfile domain object.
 */
function mapRowToProfile(row: BusinessOwnerRow): BusinessProfile {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    businessName: row.business_name,
    email: row.email,
    googleReviewUrl: row.google_review_url,
    subscriptionTier: row.subscription_tier,
    smsUsedThisPeriod: row.sms_used_this_period,
    billingPeriodStart: new Date(row.billing_period_start),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class SupabaseBusinessProfileRepository implements IBusinessProfileRepository {
  /**
   * Retrieves the business profile for the given auth user ID.
   */
  async getByOwnerId(ownerId: string): Promise<Result<BusinessProfile>> {
    try {
      const { data, error } = await supabase
        .from('business_owners')
        .select('*')
        .eq('auth_user_id', ownerId)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: mapDbError(error),
            message: error.message,
            details: error,
          },
        };
      }

      return {
        success: true,
        data: mapRowToProfile(data as BusinessOwnerRow),
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred fetching business profile',
          details: err,
        },
      };
    }
  }

  /**
   * Updates the subscription tier for a business and returns the updated profile.
   * Writes an audit log entry for the tier change.
   */
  async updateSubscriptionTier(
    businessId: string,
    tier: SubscriptionTier,
  ): Promise<Result<BusinessProfile>> {
    try {
      const { data, error } = await supabase
        .from('business_owners')
        .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .select('*')
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: mapDbError(error),
            message: error.message,
            details: error,
          },
        };
      }

      // Write audit log entry for subscription tier change
      await supabase.from('audit_log').insert({
        actor_id: (data as BusinessOwnerRow).auth_user_id,
        event_type: 'subscription_tier_changed',
        resource_id: businessId,
        metadata: { new_tier: tier },
      });

      return {
        success: true,
        data: mapRowToProfile(data as BusinessOwnerRow),
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred updating subscription tier',
          details: err,
        },
      };
    }
  }

  /**
   * Increments the sms_used_this_period counter by 1 and returns the new count.
   * Writes an audit log entry for the SMS usage increment.
   */
  async incrementSmsUsage(businessId: string): Promise<Result<number>> {
    try {
      // Use RPC or manual increment: read current value, increment, and update
      const { data: current, error: readError } = await supabase
        .from('business_owners')
        .select('sms_used_this_period, auth_user_id')
        .eq('id', businessId)
        .single();

      if (readError) {
        return {
          success: false,
          error: {
            code: mapDbError(readError),
            message: readError.message,
            details: readError,
          },
        };
      }

      const newCount = (current as { sms_used_this_period: number }).sms_used_this_period + 1;

      const { error: updateError } = await supabase
        .from('business_owners')
        .update({
          sms_used_this_period: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (updateError) {
        return {
          success: false,
          error: {
            code: mapDbError(updateError),
            message: updateError.message,
            details: updateError,
          },
        };
      }

      // Write audit log entry for SMS usage increment
      await supabase.from('audit_log').insert({
        actor_id: (current as { auth_user_id: string }).auth_user_id,
        event_type: 'sms_sent',
        resource_id: businessId,
        metadata: { sms_count: newCount },
      });

      return { success: true, data: newCount };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred incrementing SMS usage',
          details: err,
        },
      };
    }
  }

  /**
   * Resets sms_used_this_period to 0 for the given business.
   */
  async resetSmsUsage(businessId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from('business_owners')
        .update({
          sms_used_this_period: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) {
        return {
          success: false,
          error: {
            code: mapDbError(error),
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
          message: err instanceof Error ? err.message : 'An unexpected error occurred resetting SMS usage',
          details: err,
        },
      };
    }
  }

  /**
   * Returns the current SMS usage and quota for a business based on its subscription tier.
   */
  async getSmsUsage(businessId: string): Promise<Result<{ used: number; quota: number }>> {
    try {
      const { data, error } = await supabase
        .from('business_owners')
        .select('sms_used_this_period, subscription_tier')
        .eq('id', businessId)
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: mapDbError(error),
            message: error.message,
            details: error,
          },
        };
      }

      const row = data as { sms_used_this_period: number; subscription_tier: SubscriptionTier };

      return {
        success: true,
        data: {
          used: row.sms_used_this_period,
          quota: TIER_QUOTAS[row.subscription_tier],
        },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: err instanceof Error ? err.message : 'An unexpected error occurred fetching SMS usage',
          details: err,
        },
      };
    }
  }
}
