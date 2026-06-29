/**
 * Search input field with debounced Places search and result list.
 * Displays loading, empty, and error states as appropriate.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.8
 */

import React from 'react';
import { View, Text, TextInput, ActivityIndicator, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { usePlacesSearch } from '../hooks/usePlacesSearch';
import { PlacesSearchResultItem } from './PlacesSearchResultItem';
import type { PlaceResult } from '@/services/interfaces/places-search.service';

export interface PlacesSearchFieldProps {
  /** Called when the user selects a search result */
  onSelectResult: (result: PlaceResult) => void;
}

/**
 * Renders a text input labeled "Find Your Business" with debounced search,
 * an activity indicator while loading, and a list of results.
 */
export function PlacesSearchField({ onSelectResult }: PlacesSearchFieldProps) {
  const { query, setQuery, results, isLoading, isError, error } = usePlacesSearch();

  const showEmpty = !isLoading && !isError && results.length === 0 && query.length >= 3;

  return (
    <View className="w-full">
      <Text className="text-caption font-medium text-navy mb-1">
        Find Your Business
      </Text>

      {/* Search input */}
      <View className="flex-row items-center border border-light-gray rounded-xl bg-white px-3">
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          className="flex-1 px-2 py-3 text-body text-navy"
          placeholder="Search by business name..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Find Your Business"
          accessibilityHint="Type at least 3 characters to search for your business"
        />
        {isLoading && <ActivityIndicator size="small" color="#6366F1" />}
      </View>

      {/* Error states */}
      {isError && error && (
        <Text className="text-caption text-red-500 mt-2" accessibilityLiveRegion="polite">
          {error.message.includes('network') || error.message.includes('Network')
            ? 'An internet connection is required to search. You can paste your Google Review link below.'
            : 'Search is temporarily unavailable. You can paste your Google Review link below.'}
        </Text>
      )}

      {/* Empty state */}
      {showEmpty && (
        <Text className="text-caption text-navy/60 mt-2" accessibilityLiveRegion="polite">
          No businesses found. Try a different search or paste your Google Review link below.
        </Text>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <View className="mt-2 border border-light-gray rounded-xl overflow-hidden bg-white">
          <FlatList
            data={results}
            keyExtractor={(item) => item.placeId}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <PlacesSearchResultItem
                name={item.name}
                formattedAddress={item.formattedAddress}
                rating={item.rating}
                onSelect={() => onSelectResult(item)}
              />
            )}
          />
        </View>
      )}
    </View>
  );
}
