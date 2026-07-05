/**
 * Supabase repository adapter for InboxItem operations.
 * Implements IInboxItemRepository using the Supabase client.
 * Maps snake_case database rows to camelCase domain objects and wraps
 * all operations in Result<T> with appropriate error codes.
 */

import type { IInboxItemRepository } from '@/services/interfaces/inbox-item.service';
import type { Result, InboxItem } from '@/types';
import { ErrorCode } from '@/types';
import { supabase } from '../client';

/** Raw row shape returned from the inbox_items table. */
interface InboxItemRow {
  id: string;
  business_id: string;
  type: string;
  title: string;
  body: string;
  is_dismissed: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Maps a snake_case database row to a camelCase InboxItem domain object. */
function mapRowToDomain(row: InboxItemRow): InboxItem {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type as InboxItem['type'],
    title: row.title,
    body: row.body,
    isDismissed: row.is_dismissed,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
  };
}

export class SupabaseInboxItemRepository implements IInboxItemRepository {
  /**
   * Retrieves all active (non-dismissed) inbox items for a business,
   * sorted by most recent first.
   */
  async getActive(businessId: string): Promise<Result<InboxItem[]>> {
    try {
      const { data, error } = await supabase
        .from('inbox_items')
        .select()
        .eq('business_id', businessId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

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

      const items = (data as InboxItemRow[]).map(mapRowToDomain);
      return { success: true, data: items };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while fetching inbox items',
          details: err,
        },
      };
    }
  }

  /**
   * Dismisses an inbox item by setting is_dismissed = true.
   */
  async dismiss(itemId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase
        .from('inbox_items')
        .update({ is_dismissed: true })
        .eq('id', itemId);

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

      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while dismissing inbox item',
          details: err,
        },
      };
    }
  }
}
