/**
 * Settings screen (Settings tab).
 * Displays account info, subscription/usage, notifications status,
 * app version, and logout action.
 *
 * Requirements: 8.2, 2.7
 */

import { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';

import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { TIER_QUOTAS, type SubscriptionTier } from '@/types';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

function getUsagePercentage(used: number, quota: number): number {
  if (quota <= 0) return 0;
  return Math.min(Math.round((used / quota) * 100), 100);
}

// ─── Settings Screen ─────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { signOut } = useAuthContext();
  const { data: profile, isLoading, refetch } = useBusinessProfile();

  // Refresh profile data each time the screen is focused (Req 8.2)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // ─── Logout Handler ───────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ],
    );
  }, [signOut]);

  // ─── Loading State ────────────────────────────────────────────────────────

  if (isLoading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-card-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <LoadingIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Derived Values ───────────────────────────────────────────────────────

  const tier = profile?.subscriptionTier ?? 'starter';
  const tierName = TIER_DISPLAY_NAMES[tier];
  const quota = TIER_QUOTAS[tier];
  const used = profile?.smsUsedThisPeriod ?? 0;
  const remaining = Math.max(quota - used, 0);
  const usagePercent = getUsagePercentage(used, quota);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-card-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-heading font-bold text-navy">Settings</Text>
        </View>

        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-caption font-semibold text-navy/50 uppercase tracking-wide mb-3">
            Account
          </Text>
          <View className="bg-white rounded-2xl border border-light-gray overflow-hidden">
            <View className="px-4 py-3 border-b border-light-gray flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-rocket-orange/10 items-center justify-center mr-3">
                <Ionicons name="business" size={20} color="#FF6B35" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-semibold text-navy">
                  {profile?.businessName ?? '—'}
                </Text>
                <Text className="text-caption text-navy/50">Business</Text>
              </View>
            </View>
            <View className="px-4 py-3 border-b border-light-gray flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#0B1736" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium text-navy">
                  {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
                </Text>
                <Text className="text-caption text-navy/50">Owner</Text>
              </View>
            </View>
            <View className="px-4 py-3 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                <Ionicons name="mail" size={20} color="#0B1736" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium text-navy" numberOfLines={1}>
                  {profile?.email ?? '—'}
                </Text>
                <Text className="text-caption text-navy/50">Email</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription & Usage Section */}
        <View className="mb-6">
          <Text className="text-caption font-semibold text-navy/50 uppercase tracking-wide mb-3">
            Subscription
          </Text>
          <View className="bg-white rounded-2xl border border-light-gray p-4">
            {/* Tier Badge */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="bg-rocket-orange/10 px-3 py-1 rounded-full">
                  <Text className="text-caption font-bold text-rocket-orange">
                    {tierName}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upgrade Plan"
                className="active:opacity-70"
                onPress={() => router.push('/subscription')}
              >
                <Text className="text-caption font-semibold text-rocket-orange">
                  Upgrade Plan
                </Text>
              </Pressable>
            </View>

            {/* Usage Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-caption text-navy/70">
                  SMS Usage
                </Text>
                <Text className="text-caption font-medium text-navy">
                  {used} / {quota}
                </Text>
              </View>
              <View className="h-2 bg-light-gray rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    usagePercent >= 100
                      ? 'bg-red-500'
                      : usagePercent >= 80
                        ? 'bg-yellow-500'
                        : 'bg-success-green'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </View>
            </View>

            {/* Remaining Count */}
            <Text className="text-caption text-navy/50">
              {remaining} messages remaining this period
            </Text>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="mb-6">
          <Text className="text-caption font-semibold text-navy/50 uppercase tracking-wide mb-3">
            Notifications
          </Text>
          <View className="bg-white rounded-2xl border border-light-gray overflow-hidden">
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                  <Ionicons name="notifications" size={20} color="#0B1736" />
                </View>
                <View className="flex-1">
                  <Text className="text-body font-medium text-navy">
                    Push Notifications
                  </Text>
                  <Text className="text-caption text-navy/50">
                    Get notified about new feedback
                  </Text>
                </View>
              </View>
              <View className="bg-success-green/10 px-2 py-0.5 rounded-full">
                <Text className="text-caption font-medium text-success-green">
                  Enabled
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View className="mb-8">
          <Text className="text-caption font-semibold text-navy/50 uppercase tracking-wide mb-3">
            About
          </Text>
          <View className="bg-white rounded-2xl border border-light-gray overflow-hidden">
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                  <Ionicons name="information-circle" size={20} color="#0B1736" />
                </View>
                <Text className="text-body font-medium text-navy">
                  App Version
                </Text>
              </View>
              <Text className="text-caption text-navy/50">
                v{appVersion}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          className="bg-white rounded-2xl border border-red-200 py-4 items-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text className="text-body font-semibold text-red-500">
              Log Out
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
