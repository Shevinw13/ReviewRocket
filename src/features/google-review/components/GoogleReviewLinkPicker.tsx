/**
 * Compound component orchestrating the search-first Google Review link
 * experience with a manual URL fallback. Manages idle/connected state machine.
 *
 * Requirements: 1.5, 1.6, 4.3, 5.1, 5.2
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text } from 'react-native';

import { buildGoogleReviewUrl } from '../utils/googleReviewUrl';
import { PlacesSearchField } from './PlacesSearchField';
import { ManualUrlInput } from './ManualUrlInput';
import { ConnectedBusinessCard } from './ConnectedBusinessCard';
import type { PlaceResult } from '@/services/interfaces/places-search.service';

export interface GoogleReviewLinkPickerValue {
  businessName: string;
  googleReviewUrl: string;
  source: 'places_search' | 'manual_url';
}

export interface GoogleReviewLinkPickerProps {
  /** If provided, starts in 'connected' state showing the connected business */
  initialValue?: { businessName: string; googleReviewUrl: string };
  /** Called when a business is connected via search or manual URL entry */
  onBusinessConnected: (value: GoogleReviewLinkPickerValue) => void;
}

type PickerState = 'idle' | 'connected';

/**
 * Orchestrates search + manual entry for connecting a Google Business.
 * Shows ConnectedBusinessCard when a business is connected, with a "Change" action.
 */
export function GoogleReviewLinkPicker({
  initialValue,
  onBusinessConnected,
}: GoogleReviewLinkPickerProps) {
  const [state, setState] = useState<PickerState>(
    initialValue ? 'connected' : 'idle',
  );
  const [connectedBusiness, setConnectedBusiness] = useState<{
    businessName: string;
    googleReviewUrl: string;
  } | null>(initialValue ?? null);

  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup success timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleSearchResultSelected = useCallback(
    (result: PlaceResult) => {
      const googleReviewUrl = buildGoogleReviewUrl(result.placeId);
      const value: GoogleReviewLinkPickerValue = {
        businessName: result.name,
        googleReviewUrl,
        source: 'places_search',
      };

      setConnectedBusiness({ businessName: result.name, googleReviewUrl });
      setState('connected');
      onBusinessConnected(value);

      // Show success message briefly
      setShowSuccess(true);
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    },
    [onBusinessConnected],
  );

  const handleManualUrl = useCallback(
    (url: string) => {
      const value: GoogleReviewLinkPickerValue = {
        businessName: '',
        googleReviewUrl: url,
        source: 'manual_url',
      };

      setConnectedBusiness({ businessName: '', googleReviewUrl: url });
      setState('connected');
      onBusinessConnected(value);
    },
    [onBusinessConnected],
  );

  const handleChange = useCallback(() => {
    setState('idle');
    setConnectedBusiness(null);
    setShowSuccess(false);
  }, []);

  // Connected state: show the connected business card
  if (state === 'connected' && connectedBusiness) {
    return (
      <View className="w-full">
        {showSuccess && (
          <Text
            className="text-caption text-green-600 mb-2"
            accessibilityLiveRegion="polite"
          >
            ✓ Google Business connected successfully
          </Text>
        )}
        <ConnectedBusinessCard
          businessName={connectedBusiness.businessName}
          googleReviewUrl={connectedBusiness.googleReviewUrl}
          onChangePress={handleChange}
        />
      </View>
    );
  }

  // Idle state: show search + divider + manual entry
  return (
    <View className="w-full">
      {/* Recommended label */}
      <Text className="text-caption font-medium text-navy/60 mb-1">
        Recommended
      </Text>

      {/* Places Search */}
      <PlacesSearchField onSelectResult={handleSearchResultSelected} />

      {/* Visual "or" divider */}
      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-light-gray" />
        <Text className="mx-4 text-caption text-navy/40">or</Text>
        <View className="flex-1 h-px bg-light-gray" />
      </View>

      {/* Manual URL Input */}
      <ManualUrlInput onValidUrl={handleManualUrl} />
    </View>
  );
}
