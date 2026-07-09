/**
 * Settings screen (Settings tab).
 * Displays account info, subscription/usage, notifications toggle,
 * support mailto, website link, app version, and logout action.
 *
 * Requirements: 8.2, 2.7, 12.1, 12.2, 12.3, 13.1, 14.1, 14.2, 15.1, 15.2
 */

import { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import { useService } from '@/services';
import { useTheme, type ThemePreference } from '@/theme/ThemeContext';
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
  const { preference: themePreference, setPreference: setThemePreference, colors: t } = useTheme();
  const feedbackRepo = useService('feedback');
  const reviewRequestRepo = useService('reviewRequests');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check current notification permission status on mount and focus
  const checkNotificationStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }, []);

  useEffect(() => {
    checkNotificationStatus();
  }, [checkNotificationStatus]);

  // Refresh profile data and notification status each time the screen is focused (Req 8.2)
  useFocusEffect(
    useCallback(() => {
      refetch();
      checkNotificationStatus();
    }, [refetch, checkNotificationStatus]),
  );

  // ─── Notifications Toggle Handler (Req 12.1, 12.2, 12.3) ────────────────

  const handleNotificationsToggle = useCallback(async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
      } else {
        // Permission denied — inform user to enable in device settings
        Alert.alert(
          'Notifications Disabled',
          'To enable push notifications, please go to your device settings and allow notifications for Nudgli.',
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ],
        );
        setNotificationsEnabled(false);
      }
    } else {
      setNotificationsEnabled(false);
    }
  }, []);

  // ─── Support & Website Handlers (Req 14.1, 14.2, 15.1, 15.2) ─────────────

  const handleSupportPress = useCallback(async () => {
    try {
      await Linking.openURL('mailto:support@nudgli.app');
    } catch {
      Alert.alert('Unable to open email', 'Please email support@nudgli.app manually.');
    }
  }, []);

  const handleWebsitePress = useCallback(async () => {
    try {
      await Linking.openURL('https://nudgli.app');
    } catch {
      Alert.alert('Unable to open browser', 'Please visit https://nudgli.app manually.');
    }
  }, []);

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

  const handleExportFeedback = useCallback(() => {
    router.push('/history');
  }, []);

  // ─── Loading State ────────────────────────────────────────────────────────

  if (isLoading && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
        <View className="flex-1 bg-card-bg items-center justify-center">
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
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <ScrollView
        className="flex-1" style={{ backgroundColor: t.bg }}
        contentContainerClassName="pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Navy Header */}
        <View className="bg-navy px-5 pt-4 pb-8">
          <Text className="text-2xl font-bold text-white">Settings</Text>
        </View>

        {/* Content */}
        <View className="px-5 -mt-4">

        {/* Account Section */}
        <View className="mb-6">
          <Text className="text-caption font-semibold uppercase tracking-wide mb-3" style={{ color: t.textMuted }}>
            Account
          </Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
            <Pressable
              className="px-4 py-3 border-b border-light-gray flex-row items-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Edit Business"
              onPress={() => router.push('/edit-business')}
            >
              <View className="w-10 h-10 rounded-full bg-teal/10 items-center justify-center mr-3">
                <Ionicons name="business-outline" size={20} color="#0CBFA6" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-semibold" style={{ color: t.text }}>
                  {profile?.businessName ?? '—'}
                </Text>
                {profile?.googleReviewUrl ? (
                  <Text className="text-caption" style={{ color: t.textMuted }} numberOfLines={1}>
                    {profile.googleReviewUrl.replace(/^https?:\/\//, '').slice(0, 40)}...
                  </Text>
                ) : (
                  <Text className="text-caption text-amber-500">
                    Google Review link not set
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0B1D3A" style={{ opacity: 0.4 }} />
            </Pressable>
            <Pressable
              className="px-4 py-3 border-b border-light-gray flex-row items-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Edit User Profile"
              onPress={() => router.push('/edit-profile')}
            >
              <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                <Ionicons name="person-outline" size={20} color="#0B1D3A" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium" style={{ color: t.text }}>
                  {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
                </Text>
                <Text className="text-caption" style={{ color: t.textMuted }}>User Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0B1D3A" style={{ opacity: 0.4 }} />
            </Pressable>
            <Pressable
              className="px-4 py-3 flex-row items-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Manage Subscription"
              onPress={() => router.push('/subscription')}
            >
              <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                <Ionicons name="card-outline" size={20} color="#0B1D3A" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium" style={{ color: t.text }}>
                  Subscription
                </Text>
                <Text className="text-caption" style={{ color: t.textMuted }}>Manage your plan</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0B1D3A" style={{ opacity: 0.4 }} />
            </Pressable>
          </View>
        </View>

        {/* Subscription & Usage Section */}
        <View className="mb-6">
          <Text className="text-caption font-semibold uppercase tracking-wide mb-3" style={{ color: t.textMuted }}>
            Subscription
          </Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
            {/* Tier Badge */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="bg-teal/10 px-3 py-1 rounded-full">
                  <Text className="text-caption font-bold text-teal">
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
                <Text className="text-caption font-semibold text-teal">
                  Upgrade Plan
                </Text>
              </Pressable>
            </View>

            {/* Usage Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-caption" style={{ color: t.textSecondary }}>
                  SMS Usage
                </Text>
                <Text className="text-caption font-medium" style={{ color: t.text }}>
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
            <Text className="text-caption" style={{ color: t.textMuted }}>
              {remaining} messages remaining this period
            </Text>
          </View>
        </View>

        {/* Notifications Section (Req 12.1, 12.2, 12.3) */}
        <View className="mb-6">
          <Text className="text-caption font-semibold uppercase tracking-wide mb-3" style={{ color: t.textMuted }}>
            Notifications
          </Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                  <Ionicons name="notifications-outline" size={20} color="#0B1D3A" />
                </View>
                <View className="flex-1">
                  <Text className="text-body font-medium" style={{ color: t.text }}>
                    Push Notifications
                  </Text>
                  <Text className="text-caption" style={{ color: t.textMuted }}>
                    Get notified about new feedback
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#E5E7EB', true: '#0CBFA6' }}
                thumbColor="#FFFFFF"
                accessibilityRole="switch"
                accessibilityLabel="Toggle push notifications"
              />
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View className="mb-6">
          <Text className="text-caption font-semibold uppercase tracking-wide mb-3" style={{ color: t.textMuted }}>
            Appearance
          </Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-card-bg dark:bg-dark-bg items-center justify-center mr-3">
                  <Ionicons name="moon-outline" size={20} color={themePreference === 'dark' ? '#0CBFA6' : '#0B1D3A'} />
                </View>
                <View className="flex-1">
                  <Text className="text-body font-medium" style={{ color: t.text }}>
                    Theme
                  </Text>
                  <Text className="text-caption" style={{ color: t.textMuted }}>
                    {themePreference === 'system' ? 'System default' : themePreference === 'dark' ? 'Dark' : 'Light'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() => setThemePreference('light')}
                  className={`px-3 py-1.5 rounded-lg ${themePreference === 'light' ? 'bg-navy dark:bg-teal' : 'bg-card-bg dark:bg-dark-bg'}`}
                  accessibilityRole="button"
                  accessibilityLabel="Light theme"
                >
                  <Ionicons name="sunny-outline" size={16} color={themePreference === 'light' ? '#FFFFFF' : '#9CA3AF'} />
                </Pressable>
                <Pressable
                  onPress={() => setThemePreference('system')}
                  className={`px-3 py-1.5 rounded-lg ${themePreference === 'system' ? 'bg-navy dark:bg-teal' : 'bg-card-bg dark:bg-dark-bg'}`}
                  accessibilityRole="button"
                  accessibilityLabel="System theme"
                >
                  <Ionicons name="phone-portrait-outline" size={16} color={themePreference === 'system' ? '#FFFFFF' : '#9CA3AF'} />
                </Pressable>
                <Pressable
                  onPress={() => setThemePreference('dark')}
                  className={`px-3 py-1.5 rounded-lg ${themePreference === 'dark' ? 'bg-navy dark:bg-teal' : 'bg-card-bg dark:bg-dark-bg'}`}
                  accessibilityRole="button"
                  accessibilityLabel="Dark theme"
                >
                  <Ionicons name="moon-outline" size={16} color={themePreference === 'dark' ? '#FFFFFF' : '#9CA3AF'} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Support & About Section (Req 14.1, 14.2, 15.1, 15.2, 13.1) */}
        <View className="mb-8">
          <Text className="text-caption font-semibold uppercase tracking-wide mb-3" style={{ color: t.textMuted }}>
            About
          </Text>
          <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
            {/* Support Row */}
            <Pressable
              className="px-4 py-3 border-b border-light-gray flex-row items-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Contact Support"
              onPress={handleSupportPress}
            >
              <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                <Ionicons name="mail-outline" size={20} color="#0B1D3A" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium" style={{ color: t.text }}>
                  Support
                </Text>
                <Text className="text-caption" style={{ color: t.textMuted }}>
                  support@nudgli.app
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0B1D3A" style={{ opacity: 0.4 }} />
            </Pressable>
            {/* Website Row */}
            <Pressable
              className="px-4 py-3 border-b border-light-gray flex-row items-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Visit Website"
              onPress={handleWebsitePress}
            >
              <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                <Ionicons name="globe-outline" size={20} color="#0B1D3A" />
              </View>
              <View className="flex-1">
                <Text className="text-body font-medium" style={{ color: t.text }}>
                  Website
                </Text>
                <Text className="text-caption" style={{ color: t.textMuted }}>
                  nudgli.app
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#0B1D3A" style={{ opacity: 0.4 }} />
            </Pressable>
            {/* App Version Row */}
            <View className="px-4 py-3 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-card-bg items-center justify-center mr-3">
                  <Ionicons name="information-circle-outline" size={20} color="#0B1D3A" />
                </View>
                <Text className="text-body font-medium" style={{ color: t.text }}>
                  App Version
                </Text>
              </View>
              <Text className="text-caption" style={{ color: t.textMuted }}>
                v{appVersion}
              </Text>
            </View>
          </View>
        </View>

        {/* Export Feedback */}
        <View className="mb-6">
          <Text className="text-caption font-semibold uppercase tracking-wide mb-3" style={{ color: t.textMuted }}>
            Data
          </Text>
          <Pressable
            onPress={handleExportFeedback}
            className="rounded-2xl py-4 items-center active:opacity-70"
            style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}
            accessibilityRole="button"
            accessibilityLabel="Export feedback as CSV"
          >
            <View className="flex-row items-center">
              <Ionicons name="download-outline" size={20} color="#0CBFA6" style={{ marginRight: 8 }} />
              <Text className="text-body font-semibold text-teal">
                Export Feedback (CSV)
              </Text>
            </View>
          </Pressable>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
