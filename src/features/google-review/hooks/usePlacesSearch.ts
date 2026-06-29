/**
 * Hook for searching Google Places with debounce and minimum character guard.
 * Uses React Query for caching and request deduplication.
 *
 * Requirements: 1.2, 1.8, 3.6
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useService } from '@/services';
import type { PlaceResult } from '@/services/interfaces/places-search.service';

export interface UsePlacesSearchOptions {
  /** Debounce delay in milliseconds (default 300) */
  debounceMs?: number;
  /** Minimum characters before search triggers (default 3) */
  minChars?: number;
}

export interface UsePlacesSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: PlaceResult[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Debounced places search hook.
 * Only fires a search request after the user stops typing for `debounceMs`
 * and the query is at least `minChars` characters long.
 */
export function usePlacesSearch(options: UsePlacesSearchOptions = {}): UsePlacesSearchReturn {
  const { debounceMs = 300, minChars = 3 } = options;

  const placesSearch = useService('placesSearch');

  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Only start debounce timer if query meets minimum length
      if (q.length >= minChars) {
        timerRef.current = setTimeout(() => {
          setDebouncedQuery(q);
        }, debounceMs);
      } else {
        // Reset debounced query immediately for short strings
        setDebouncedQuery('');
      }
    },
    [debounceMs, minChars],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const { data, isLoading, isError, error } = useQuery<PlaceResult[], Error>({
    queryKey: ['places-search', debouncedQuery],
    queryFn: async () => {
      const result = await placesSearch.search(debouncedQuery);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: debouncedQuery.length >= minChars,
  });

  return {
    query,
    setQuery,
    results: data ?? [],
    isLoading: isLoading && debouncedQuery.length >= minChars,
    isError,
    error: error ?? null,
  };
}
