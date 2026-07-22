/**
 * Messaging Pending Screen.
 * Shown when a business has not yet been approved for SMS messaging.
 * The rest of the app remains usable — only sending is gated.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeContext';

export function MessagingPendingScreen() {
  const { colors: t } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: t.bg }}>
      {/* Navy Header */}
      <View className="bg-navy px-6 pt-14 pb-8">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 p-1"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text className="text-2xl font-bold text-white flex-1">
            Send Review Request
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 items-center justify-center -mt-12">
        <View className="w-20 h-20 rounded-full bg-teal/10 items-center justify-center mb-6">
          <Ionicons name="time-outline" size={40} color="#0CBFA6" />
        </View>

        <Text className="text-xl font-bold text-center mb-3" style={{ color: t.text }}>
          Setting up your messaging account
        </Text>

        <Text className="text-body text-center px-4 leading-6" style={{ color: t.textMuted }}>
          We're registering your business for SMS messaging. This usually takes a few minutes to a few hours.
        </Text>

        <Text className="text-body text-center px-4 mt-3 leading-6" style={{ color: t.textMuted }}>
          We'll send you an email as soon as your account is approved and ready to send review requests.
        </Text>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="mt-8 bg-teal rounded-xl px-8 py-4 active:opacity-80"
          accessibilityRole="button"
        >
          <Text className="text-body font-bold text-white">Continue Exploring App</Text>
        </Pressable>
      </View>
    </View>
  );
}
