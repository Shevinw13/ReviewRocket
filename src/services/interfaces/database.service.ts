/**
 * Database repository interfaces.
 * Abstracts all database access behind the repository pattern so that
 * replacing the data source requires changes only within adapter files.
 */

import type {
  Result,
  ReviewRequest,
  FeedbackRecord,
  BusinessProfile,
  SubscriptionTier,
  CreateReviewRequestDTO,
  CreateFeedbackDTO,
} from '@/types';

export interface IReviewRequestRepository {
  create(request: CreateReviewRequestDTO): Promise<Result<ReviewRequest>>;
  findByPhoneNumberWithin24Hours(
    phone: string,
    businessId: string,
  ): Promise<Result<ReviewRequest | null>>;
  getRecentByBusiness(businessId: string, limit: number): Promise<Result<ReviewRequest[]>>;
  getMonthlyCount(businessId: string, monthStart: Date): Promise<Result<number>>;
  getPreviousMonthCount(
    businessId: string,
    prevMonthStart: Date,
    prevMonthEnd: Date,
  ): Promise<Result<number>>;
  updateWithRating(id: string, rating: number): Promise<Result<ReviewRequest>>;
}

export interface IFeedbackRepository {
  create(feedback: CreateFeedbackDTO): Promise<Result<FeedbackRecord>>;
  getUnresolved(businessId: string): Promise<Result<FeedbackRecord[]>>;
  getAll(businessId: string): Promise<Result<FeedbackRecord[]>>;
  markResolved(id: string): Promise<Result<FeedbackRecord>>;
  updateFeedbackText(id: string, text: string): Promise<Result<FeedbackRecord>>;
  getUnresolvedCount(businessId: string): Promise<Result<number>>;
}

export interface IBusinessProfileRepository {
  getByOwnerId(ownerId: string): Promise<Result<BusinessProfile>>;
  updateSubscriptionTier(
    businessId: string,
    tier: SubscriptionTier,
  ): Promise<Result<BusinessProfile>>;
  incrementSmsUsage(businessId: string): Promise<Result<number>>;
  resetSmsUsage(businessId: string): Promise<Result<void>>;
  getSmsUsage(businessId: string): Promise<Result<{ used: number; quota: number }>>;
}
