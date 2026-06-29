/**
 * Inbox item repository interface.
 * Abstracts access to inbox notification items (e.g., opt-out notifications)
 * so that consumers remain decoupled from the data source.
 */

import type { Result, InboxItem } from '@/types';

export interface IInboxItemRepository {
  getActive(businessId: string): Promise<Result<InboxItem[]>>;
  dismiss(itemId: string): Promise<Result<void>>;
}
