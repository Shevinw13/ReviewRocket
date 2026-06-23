/**
 * Supabase repository adapter for ReviewRequest entities.
 * Implements IReviewRequestRepository using the Supabase client.
 *
 * Note: customer_phone and customer_name are stored encrypted in the database.
 * Edge Functions handle encryption/decryption. The mobile app stores and retrieves
 * the encrypted values as-is.
 */

import type { IReviewRequestRepository } from '@/services/interfaces/database.service';
import type { Result, ReviewRequest, CreateReviewRequestDTO } from '@/types';
import { ErrorCode } from '@/types';
import { supabase } from '../client';

/** Shape of a row in the review_requests table. */
interface ReviewRequestRow {
  id: string;
  business_id: string;
  customer_phone_encrypted: string;
  customer_name_encrypted: string | null;
  service_type: string | null;
  status: string;
  rating: number | null;
  sent_at: string;
  feedback_received_at: string | null;
  created_at: string;
}

/** Maps a database row to a ReviewRequest domain object. */
function mapRowToDomain(row: ReviewRequestRow): ReviewRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    customerPhone: row.customer_phone_encrypted,
    customerName: row.customer_name_encrypted ?? undefined,
    serviceType: row.service_type ?? undefined,
    status: row.status as ReviewRequest['status'],
    rating: row.rating ?? undefined,
    sentAt: new Date(row.sent_at),
    feedbackReceivedAt: row.feedback_received_at
      ? new Date(row.feedback_received_at)
      : undefined,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseReviewRequestRepository implements IReviewRequestRepository {
  /**
   * Creates a new review request record in the database.
   */
  async create(request: CreateReviewRequestDTO): Promise<Result<ReviewRequest>> {
    try {
      const { data, error } = await supabase
        .from('review_requests')
        .insert({
          business_id: request.businessId,
          customer_phone_encrypted: request.customerPhone,
          customer_name_encrypted: request.customerName ?? null,
          service_type: request.serviceType ?? null,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
            message: error.message,
            details: error,
          },
        };
      }

      return { success: true, data: mapRowToDomain(data as ReviewRequestRow) };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while creating review request',
          details: err,
        },
      };
    }
  }

  /**
   * Finds a review request sent to the given phone number within the last 24 hours
   * for the specified business. Used for duplicate send detection.
   */
  async findByPhoneNumberWithin24Hours(
    phone: string,
    businessId: string,
  ): Promise<Result<ReviewRequest | null>> {
    try {
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from('review_requests')
        .select()
        .eq('business_id', businessId)
        .eq('customer_phone_encrypted', phone)
        .gte('sent_at', twentyFourHoursAgo)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
            message: error.message,
            details: error,
          },
        };
      }

      if (!data) {
        return { success: true, data: null };
      }

      return { success: true, data: mapRowToDomain(data as ReviewRequestRow) };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while checking for duplicate requests',
          details: err,
        },
      };
    }
  }

  /**
   * Retrieves recent review requests for a business, ordered by creation date descending.
   * Used for the Recent Activity Feed on the Dashboard.
   */
  async getRecentByBusiness(
    businessId: string,
    limit: number,
  ): Promise<Result<ReviewRequest[]>> {
    try {
      const { data, error } = await supabase
        .from('review_requests')
        .select()
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
            message: error.message,
            details: error,
          },
        };
      }

      const requests = (data as ReviewRequestRow[]).map(mapRowToDomain);
      return { success: true, data: requests };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while fetching recent requests',
          details: err,
        },
      };
    }
  }

  /**
   * Gets the count of review requests sent for a business since the given month start date.
   * Used for the "Review Opportunities Created" metric on the Dashboard.
   */
  async getMonthlyCount(
    businessId: string,
    monthStart: Date,
  ): Promise<Result<number>> {
    try {
      const { count, error } = await supabase
        .from('review_requests')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('sent_at', monthStart.toISOString());

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
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
              : 'An unexpected error occurred while fetching monthly count',
          details: err,
        },
      };
    }
  }

  /**
   * Gets the count of review requests sent for a business in the previous month.
   * Used for month-over-month comparison on the Dashboard.
   */
  async getPreviousMonthCount(
    businessId: string,
    prevMonthStart: Date,
    prevMonthEnd: Date,
  ): Promise<Result<number>> {
    try {
      const { count, error } = await supabase
        .from('review_requests')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('sent_at', prevMonthStart.toISOString())
        .lt('sent_at', prevMonthEnd.toISOString());

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
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
              : 'An unexpected error occurred while fetching previous month count',
          details: err,
        },
      };
    }
  }

  /**
   * Updates a review request with a customer rating and marks the feedback_received_at timestamp.
   * Called when a customer replies to the SMS with a valid rating.
   */
  async updateWithRating(
    id: string,
    rating: number,
  ): Promise<Result<ReviewRequest>> {
    try {
      const { data, error } = await supabase
        .from('review_requests')
        .update({
          rating,
          feedback_received_at: new Date().toISOString(),
          status: 'rating_received',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: ErrorCode.SERVER_ERROR,
            message: error.message,
            details: error,
          },
        };
      }

      return { success: true, data: mapRowToDomain(data as ReviewRequestRow) };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while updating review request with rating',
          details: err,
        },
      };
    }
  }
}
