/**
 * Interface for the Places Search service.
 * Provides business search functionality powered by Google Places API.
 */

import type { Result } from '@/types';

/** A single place result returned from the Google Places API. */
export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
}

/** Service interface for searching Google Places. */
export interface IPlacesSearchService {
  search(query: string): Promise<Result<PlaceResult[]>>;
}
