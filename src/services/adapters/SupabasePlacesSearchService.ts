/**
 * Supabase Edge Function adapter for IPlacesSearchService.
 * Calls the `google-places-search` Edge Function with the user's JWT
 * and maps responses to the application's Result<PlaceResult[]> type.
 */

import type { Result } from '@/types';
import { ErrorCode } from '@/types';
import type { IPlacesSearchService, PlaceResult } from '@/services/interfaces/places-search.service';
import { supabase } from '@/infrastructure/supabase/client';

export class SupabasePlacesSearchService implements IPlacesSearchService {
  /**
   * Searches for businesses via the google-places-search Edge Function.
   * Passes the user's JWT automatically through the Supabase client.
   */
  async search(query: string): Promise<Result<PlaceResult[]>> {
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: { query },
      });

      // Supabase functions.invoke returns a FunctionsHttpError for non-2xx responses
      if (error) {
        const status = (error as any).context?.status;

        if (status === 401) {
          return {
            success: false,
            error: {
              code: ErrorCode.AUTH_ERROR,
              message: 'Authentication failed. Please sign in again.',
            },
          };
        }

        if (status === 502) {
          return {
            success: false,
            error: {
              code: ErrorCode.SERVER_ERROR,
              message: 'Search is temporarily unavailable. You can paste your Google Review link below.',
            },
          };
        }

        // Generic network/server error
        return {
          success: false,
          error: {
            code: ErrorCode.NETWORK_ERROR,
            message: 'An internet connection is required to search. You can paste your Google Review link below.',
          },
        };
      }

      // Successful response — extract results array
      const results: PlaceResult[] = data?.results ?? [];
      return { success: true, data: results };
    } catch (err) {
      // Network errors (offline, timeout, etc.)
      return {
        success: false,
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: 'An internet connection is required to search. You can paste your Google Review link below.',
        },
      };
    }
  }
}
