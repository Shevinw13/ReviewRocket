/**
 * Supabase repository adapter for FeedbackRecord operations.
 * Implements IFeedbackRepository using the Supabase client.
 * Maps snake_case database rows to camelCase domain objects and wraps
 * all operations in Result<T> with appropriate error codes.
 */

import type { IFeedbackRepository } from '@/services/interfaces/database.service';
import type { Result, FeedbackRecord, CreateFeedbackDTO } from '@/types';
import { ErrorCode } from '@/types';
import { supabase } from '../client';

/** Raw row shape returned from the feedback_records table. */
interface FeedbackRecordRow {
  id: string;
  review_request_id: string;
  business_id: string;
  rating: number;
  feedback_text_encrypted: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
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
 * Maps a snake_case database row to a camelCase FeedbackRecord domain object.
 */
function mapRowToDomain(row: FeedbackRecordRow): FeedbackRecord {
  return {
    id: row.id,
    reviewRequestId: row.review_request_id,
    businessId: row.business_id,
    rating: row.rating,
    feedbackText: row.feedback_text_encrypted ?? undefined,
    isResolved: row.is_resolved,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseFeedbackRecordRepository implements IFeedbackRepository {
  /**
   * Creates a new feedback record in the database.
   */
  async create(feedback: CreateFeedbackDTO): Promise<Result<FeedbackRecord>> {
    try {
      const { data, error } = await supabase
        .from('feedback_records')
        .insert({
          review_request_id: feedback.reviewRequestId,
          business_id: feedback.businessId,
          rating: feedback.rating,
          feedback_text_encrypted: feedback.feedbackText ?? null,
          is_resolved: false,
        })
        .select()
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

      return { success: true, data: mapRowToDomain(data as FeedbackRecordRow) };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while creating feedback record',
          details: err,
        },
      };
    }
  }

  /**
   * Retrieves all unresolved feedback records with rating <= 3 for a business,
   * sorted by most recent first. Used for the "Needs Attention" inbox view.
   */
  async getUnresolved(businessId: string): Promise<Result<FeedbackRecord[]>> {
    try {
      const { data, error } = await supabase
        .from('feedback_records')
        .select()
        .eq('business_id', businessId)
        .lte('rating', 3)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

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

      const records = (data as FeedbackRecordRow[]).map(mapRowToDomain);
      return { success: true, data: records };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while fetching unresolved feedback',
          details: err,
        },
      };
    }
  }

  /**
   * Retrieves all feedback records with rating <= 3 for a business (including resolved),
   * sorted by most recent first. Used for the "All Feedback" inbox view.
   */
  async getAll(businessId: string): Promise<Result<FeedbackRecord[]>> {
    try {
      const { data, error } = await supabase
        .from('feedback_records')
        .select()
        .eq('business_id', businessId)
        .lte('rating', 3)
        .order('created_at', { ascending: false });

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

      const records = (data as FeedbackRecordRow[]).map(mapRowToDomain);
      return { success: true, data: records };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while fetching all feedback',
          details: err,
        },
      };
    }
  }

  /**
   * Marks a feedback record as resolved by setting is_resolved=true and resolved_at
   * to the current timestamp. Also writes an audit log entry with event_type='feedback_resolved'.
   */
  async markResolved(id: string): Promise<Result<FeedbackRecord>> {
    try {
      const resolvedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from('feedback_records')
        .update({
          is_resolved: true,
          resolved_at: resolvedAt,
        })
        .eq('id', id)
        .select()
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

      const record = mapRowToDomain(data as FeedbackRecordRow);

      // Write audit log entry for feedback_resolved event
      const { data: sessionData } = await supabase.auth.getSession();
      const actorId = sessionData?.session?.user?.id ?? record.businessId;

      await supabase.from('audit_log').insert({
        actor_id: actorId,
        event_type: 'feedback_resolved',
        resource_id: id,
        metadata: { business_id: record.businessId, rating: record.rating },
      });

      return { success: true, data: record };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while marking feedback as resolved',
          details: err,
        },
      };
    }
  }

  /**
   * Updates the encrypted feedback text for a feedback record.
   * Called when a customer provides written feedback after a negative rating.
   */
  async updateFeedbackText(id: string, text: string): Promise<Result<FeedbackRecord>> {
    try {
      const { data, error } = await supabase
        .from('feedback_records')
        .update({ feedback_text_encrypted: text })
        .eq('id', id)
        .select()
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

      return { success: true, data: mapRowToDomain(data as FeedbackRecordRow) };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while updating feedback text',
          details: err,
        },
      };
    }
  }

  /**
   * Returns the count of unresolved feedback records with rating <= 3 for a business.
   * Used for the Inbox tab badge count.
   */
  async getUnresolvedCount(businessId: string): Promise<Result<number>> {
    try {
      const { count, error } = await supabase
        .from('feedback_records')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_resolved', false)
        .lte('rating', 3);

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

      return { success: true, data: count ?? 0 };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while fetching unresolved feedback count',
          details: err,
        },
      };
    }
  }
}
