/**
 * Onboarding walkthrough screen.
 * Shows a 3-page swipeable intro after email verification, followed by
 * plan selection. Only shown once (flag stored in AsyncStorage).
 *
 * UX Improvements: Onboarding Flow, Plan Selection During Onboarding
 */

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { type SubscriptionTier, type BusinessType, TIER_QUOTAS } from '@/types';
import { BUSINESS_TYPE_LABELS, BUSINESS_TYPE_ICONS } from '@/utils/smsTemplates';
import { hapticLight } from '@/utils/haptics';

// ─── Constants ───────────────────────────────────────────────────────────────

const ONBOARDING_COMPLETE_KEY = '@nudgli/onboarding_complete';

interface OnboardingPage {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    icon: 'chatbubble-ellipses-outline',
    title: 'Send a Text',
    description:
      "After every job, enter your customer's phone number. We'll send them a friendly feedback request.",
  },
  {
    id: '2',
    icon: 'star-outline',
    title: 'Collect Ratings',
    description:
      'Customers reply with a simple 1-5 rating via text — or send your Google review link directly. No app download needed.',
  },
  {
    id: '3',
    icon: 'trending-up-outline',
    title: 'Grow Your Reviews',
    description:
      'Happy customers get your Google review link. Unhappy ones come directly to you.',
  },
];

// ─── Plan Selection Data ─────────────────────────────────────────────────────

interface PlanOption {
  tier: SubscriptionTier;
  name: string;
  price: string;
  smsLimit: number;
  recommended?: boolean;
  trialBadge?: string;
}

const PLANS: PlanOption[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$9.99/mo',
    smsLimit: TIER_QUOTAS.starter,
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: '$29.99/mo',
    smsLimit: TIER_QUOTAS.growth,
    recommended: true,
    trialBadge: '7-day free trial',
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$49.99/mo',
    smsLimit: TIER_QUOTAS.pro,
  },
];

// ─── Onboarding Screen ───────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBusinessTypeSelection, setShowBusinessTypeSelection] = useState(false);
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [bizPhone, setBizPhone] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizCity, setBizCity] = useState('');
  const [bizState, setBizState] = useState('');
  const [bizZip, setBizZip] = useState('');
  const [bizEin, setBizEin] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const businessProfileRepo = useService('businessProfile');
  const { data: profile, refetch: refetchProfile } = useBusinessProfile();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      // Last page — show business type selection
      setShowBusinessTypeSelection(true);
    }
  };

  const handleSelectBusinessType = async (type: BusinessType) => {
    hapticLight();
    if (profile?.id) {
      await businessProfileRepo.updateBusinessType(profile.id, type);
      await refetchProfile();
    }
    setShowBusinessTypeSelection(false);
    setShowBusinessInfo(true);
  };

  const handleBusinessInfoContinue = async () => {
    // Save business info to profile (backend will use this for Twilio registration)
    if (profile?.id) {
      await businessProfileRepo.update(profile.id, {
        businessPhone: bizPhone || undefined,
        businessAddress: bizAddress || undefined,
        businessCity: bizCity || undefined,
        businessState: bizState || undefined,
        businessZip: bizZip || undefined,
        ein: bizEin || undefined,
      } as any);
      await refetchProfile();
    }
    setShowBusinessInfo(false);
    setShowPlanSelection(true);
  };

  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    // Save selected tier to mock business profile
    if (profile?.id) {
      await businessProfileRepo.updateSubscriptionTier(profile.id, tier);
      await refetchProfile();
    }
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setShowPlanSelection(false);
    setShowConfirmation(true);
  };

  const completeOnboarding = async () => {
    router.replace('/(tabs)');
  };

  // ─── Account Created Confirmation ──────────────────────────────────────────

  if (showConfirmation) {
    return (
      <SafeAreaView className="flex-1 bg-card-bg" edges={['top', 'bottom']}>
        <View className="flex-1 px-6 items-center justify-center">
          <View className="w-20 h-20 rounded-full bg-success-green/10 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={44} color="#22C55E" />
          </View>

          <Text className="text-heading font-bold text-navy text-center mb-3">
            You're all set!
          </Text>

          <Text className="text-body text-navy/60 text-center px-4 leading-6 mb-3">
            Your account has been created successfully.
          </Text>

          <Text className="text-body text-navy/60 text-center px-4 leading-6 mb-8">
            We're setting up your dedicated messaging number now. You'll receive a push notification and email as soon as it's ready and you can start sending review requests.
          </Text>

          <View className="bg-teal/5 border border-teal/20 rounded-xl p-4 mb-8 w-full">
            <View className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={18} color="#0CBFA6" />
              <Text className="text-sm font-medium text-teal ml-2">We'll notify you when it's ready</Text>
            </View>
            <Text className="text-caption text-navy/50">
              In the meantime, you can explore the app and set up your Google Review link.
            </Text>
          </View>

          <Pressable
            onPress={completeOnboarding}
            className="bg-teal rounded-2xl py-4 px-8 items-center active:opacity-80 w-full"
            accessibilityRole="button"
          >
            <Text className="text-body font-bold text-white">Start Exploring</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Business Type Selection View ──────────────────────────────────────────

  if (showBusinessTypeSelection) {
    const BUSINESS_TYPES: BusinessType[] = ['trades', 'restaurant', 'health_beauty', 'professional', 'other'];

    return (
      <SafeAreaView className="flex-1 bg-card-bg" edges={['top', 'bottom']}>
        <View className="flex-1 px-5 pt-8">
          <Text className="text-heading font-bold text-navy text-center mb-2">
            What type of business?
          </Text>
          <Text className="text-body text-navy/60 text-center mb-8">
            We'll tailor your customer messages to match.
          </Text>

          {/* Business Type Cards */}
          {BUSINESS_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => handleSelectBusinessType(type)}
              className="flex-row items-center rounded-2xl border border-light-gray bg-white p-4 mb-3 active:opacity-80 active:border-teal"
              accessibilityRole="button"
              accessibilityLabel={`Select ${BUSINESS_TYPE_LABELS[type]}`}
            >
              <View className="w-11 h-11 rounded-full bg-teal/10 items-center justify-center mr-4">
                <Ionicons
                  name={BUSINESS_TYPE_ICONS[type] as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color="#0CBFA6"
                />
              </View>
              <Text className="text-body font-medium text-navy flex-1">
                {BUSINESS_TYPE_LABELS[type]}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Business Info View ────────────────────────────────────────────────────

  if (showBusinessInfo) {
    const canContinue = bizPhone.length >= 10 && bizAddress.length > 0 && bizCity.length > 0 && bizState.length > 0 && bizZip.length >= 5;

    return (
      <SafeAreaView className="flex-1 bg-card-bg" edges={['top', 'bottom']}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView className="flex-1 px-5 pt-8" keyboardShouldPersistTaps="handled" contentContainerClassName="pb-8">
            <Text className="text-heading font-bold text-navy text-center mb-2">
              Business Details
            </Text>
            <Text className="text-body text-navy/60 text-center mb-8">
              We need a few details to set up your messaging account.
            </Text>

            {/* Business Phone */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-navy mb-1">Business Phone</Text>
              <TextInput
                className="border border-light-gray rounded-xl bg-white px-4 py-3.5 text-body text-navy"
                placeholder="(404) 555-1234"
                placeholderTextColor="#9CA3AF"
                value={bizPhone}
                onChangeText={setBizPhone}
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>

            {/* Address */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-navy mb-1">Street Address</Text>
              <TextInput
                className="border border-light-gray rounded-xl bg-white px-4 py-3.5 text-body text-navy"
                placeholder="123 Main St"
                placeholderTextColor="#9CA3AF"
                value={bizAddress}
                onChangeText={setBizAddress}
                autoCapitalize="words"
              />
            </View>

            {/* City + State row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-navy mb-1">City</Text>
                <TextInput
                  className="border border-light-gray rounded-xl bg-white px-4 py-3.5 text-body text-navy"
                  placeholder="Atlanta"
                  placeholderTextColor="#9CA3AF"
                  value={bizCity}
                  onChangeText={setBizCity}
                  autoCapitalize="words"
                />
              </View>
              <View className="w-20">
                <Text className="text-sm font-medium text-navy mb-1">State</Text>
                <TextInput
                  className="border border-light-gray rounded-xl bg-white px-4 py-3.5 text-body text-navy"
                  placeholder="GA"
                  placeholderTextColor="#9CA3AF"
                  value={bizState}
                  onChangeText={setBizState}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>
            </View>

            {/* Zip */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-navy mb-1">Zip Code</Text>
              <TextInput
                className="border border-light-gray rounded-xl bg-white px-4 py-3.5 text-body text-navy"
                placeholder="30301"
                placeholderTextColor="#9CA3AF"
                value={bizZip}
                onChangeText={setBizZip}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>

            {/* EIN (optional) */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-navy mb-1">EIN (optional)</Text>
              <TextInput
                className="border border-light-gray rounded-xl bg-white px-4 py-3.5 text-body text-navy"
                placeholder="XX-XXXXXXX"
                placeholderTextColor="#9CA3AF"
                value={bizEin}
                onChangeText={setBizEin}
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text className="text-caption text-navy/40 mt-1">
                Don't have one? No problem — skip this.
              </Text>
            </View>

            {/* Continue Button */}
            <Pressable
              onPress={handleBusinessInfoContinue}
              disabled={!canContinue}
              className={`rounded-2xl py-4 items-center ${canContinue ? 'bg-teal' : 'bg-teal/40'}`}
              accessibilityRole="button"
            >
              <Text className="text-body font-bold text-white">Continue</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Plan Selection View ──────────────────────────────────────────────────

  if (showPlanSelection) {
    return (
      <SafeAreaView className="flex-1 bg-card-bg" edges={['top', 'bottom']}>
        <View className="flex-1 px-5 pt-8">
          <Text className="text-heading font-bold text-navy text-center mb-2">
            Choose Your Plan
          </Text>
          <Text className="text-body text-navy/60 text-center mb-8">
            Start growing your reviews today.
          </Text>

          {/* Plan Cards */}
          {PLANS.map((plan) => (
            <View
              key={plan.tier}
              className={`rounded-2xl border p-5 mb-4 ${
                plan.recommended
                  ? 'border-teal bg-teal/5'
                  : 'border-light-gray bg-white'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Text
                    className={`text-body font-bold ${
                      plan.recommended ? 'text-teal' : 'text-navy'
                    }`}
                  >
                    {plan.name}
                  </Text>
                  {plan.trialBadge && (
                    <View className="ml-2 bg-teal/10 px-2 py-0.5 rounded-full">
                      <Text className="text-caption font-semibold text-teal">
                        {plan.trialBadge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-body font-bold text-navy">{plan.price}</Text>
              </View>
              <View className="flex-row items-center mb-3">
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color={plan.recommended ? '#0CBFA6' : '#6B7280'}
                />
                <Text
                  className={`text-caption ml-2 ${
                    plan.recommended ? 'text-teal/80' : 'text-navy/60'
                  }`}
                >
                  {plan.smsLimit.toLocaleString()} SMS messages per month
                </Text>
              </View>

              {plan.recommended ? (
                <Pressable
                  onPress={() => handleSelectPlan(plan.tier)}
                  className="bg-teal rounded-xl py-3 items-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={`Start Free Trial with ${plan.name}`}
                >
                  <Text className="text-caption font-bold text-white">
                    Start Free Trial
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleSelectPlan(plan.tier)}
                  className="border border-light-gray rounded-xl py-3 items-center active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${plan.name} plan`}
                >
                  <Text className="text-caption font-bold text-navy">
                    Select {plan.name}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* Secondary option */}
          <Pressable
            onPress={() => handleSelectPlan('starter')}
            className="mt-4 py-3 items-center"
            accessibilityRole="button"
            accessibilityLabel="Start with Starter"
          >
            <Text className="text-body font-medium text-navy/60">
              Start with Starter
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Walkthrough View ─────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-card-bg" edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center px-8"
          >
            <View className="w-24 h-24 rounded-full bg-teal/10 items-center justify-center mb-8">
              <Ionicons name={item.icon} size={48} color="#0CBFA6" />
            </View>
            <Text className="text-heading font-bold text-navy text-center mb-4">
              {item.title}
            </Text>
            <Text className="text-body text-navy/70 text-center px-4">
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View className="flex-row items-center justify-center mb-6">
        {PAGES.map((_, i) => (
          <View
            key={i}
            className={`w-2 h-2 rounded-full mx-1 ${
              i === currentIndex ? 'bg-teal' : 'bg-light-gray'
            }`}
          />
        ))}
      </View>

      {/* Action Button */}
      <View className="px-5 pb-6">
        <Pressable
          onPress={handleNext}
          className="bg-teal rounded-2xl py-4 items-center active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={currentIndex === PAGES.length - 1 ? 'Get Started' : 'Next'}
        >
          <Text className="text-body font-bold text-white">
            {currentIndex === PAGES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
