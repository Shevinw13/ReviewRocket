import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { SuccessIndicator } from '@/components/ui/SuccessIndicator';

// ─── Account & Security Screen ───────────────────────────────────────────────

/**
 * Account & Security screen.
 *
 * Shows the user's account info (name, email) and provides
 * security actions: change password, delete account.
 */
export default function EditProfileScreen() {
  const authService = useService('auth');
  const { data: profile } = useBusinessProfile();

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ─── Change Password Handler ─────────────────────────────────────────────

  const handleChangePassword = useCallback(async () => {
    if (!profile?.email) return;

    const result = await authService.requestPasswordReset(profile.email);

    if (result.success) {
      setSuccessMessage('Password reset email sent!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      Alert.alert(
        'Unable to Send',
        'Something went wrong sending the reset email. Please try again.',
      );
    }
  }, [profile, authService]);

  // ─── Delete Account Handler ──────────────────────────────────────────────

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Contact Support',
              'To delete your account, please email support@nudgli.app and we will process your request within 48 hours.',
            );
          },
        },
      ],
    );
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-12"
    >
      {/* Navy Header */}
      <View className="bg-navy px-6 pt-14 pb-8">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.navigate('/(tabs)/settings')}
            className="mr-3 p-1"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-2xl font-bold text-white flex-1">
            Account & Security
          </Text>
        </View>
        <Text className="text-sm text-white/60 mt-2 ml-10">
          Manage your login and account settings
        </Text>
      </View>

      {/* White Card Content */}
      <View className="rounded-t-3xl bg-white px-6 pt-8 pb-6 -mt-4">
        {/* Success Toast */}
        {showSuccess && (
          <View className="mb-6">
            <SuccessIndicator visible={true} message={successMessage} duration={2500} />
          </View>
        )}

        {/* Account Info Section */}
        <Text className="text-caption font-semibold uppercase tracking-wide text-navy/50 mb-3">
          Account Info
        </Text>
        <View className="rounded-2xl border border-light-gray bg-card-bg overflow-hidden mb-8">
          {/* Name */}
          <View className="px-4 py-3.5 border-b border-light-gray flex-row items-center">
            <Ionicons name="person-outline" size={20} color="#9CA3AF" />
            <View className="ml-3 flex-1">
              <Text className="text-caption text-navy/50">Name</Text>
              <Text className="text-body font-medium text-navy">
                {profile ? `${profile.firstName} ${profile.lastName}` : '—'}
              </Text>
            </View>
          </View>

          {/* Email */}
          <View className="px-4 py-3.5 flex-row items-center">
            <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
            <View className="ml-3 flex-1">
              <Text className="text-caption text-navy/50">Email</Text>
              <Text className="text-body font-medium text-navy">
                {profile?.email || '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <Text className="text-caption font-semibold uppercase tracking-wide text-navy/50 mb-3">
          Security
        </Text>
        <View className="rounded-2xl border border-light-gray bg-card-bg overflow-hidden mb-8">
          {/* Change Password */}
          <Pressable
            onPress={handleChangePassword}
            className="px-4 py-4 flex-row items-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <View className="w-9 h-9 rounded-full bg-teal/10 items-center justify-center mr-3">
              <Ionicons name="lock-closed-outline" size={18} color="#0CBFA6" />
            </View>
            <View className="flex-1">
              <Text className="text-body font-medium text-navy">
                Change Password
              </Text>
              <Text className="text-caption text-navy/50 mt-0.5">
                We'll send a reset link to your email
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Danger Zone */}
        <Text className="text-caption font-semibold uppercase tracking-wide text-navy/50 mb-3">
          Danger Zone
        </Text>
        <View className="rounded-2xl border border-red-200 bg-red-50/50 overflow-hidden">
          <Pressable
            onPress={handleDeleteAccount}
            className="px-4 py-4 flex-row items-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <View className="w-9 h-9 rounded-full bg-red-100 items-center justify-center mr-3">
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <View className="flex-1">
              <Text className="text-body font-medium text-red-600">
                Delete Account
              </Text>
              <Text className="text-caption text-red-400 mt-0.5">
                Permanently remove your account and data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
