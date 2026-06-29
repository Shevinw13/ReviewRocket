import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EditProfileFormData {
  firstName: string;
  lastName: string;
}

// ─── Edit Profile Screen ─────────────────────────────────────────────────────

/**
 * Edit Profile screen.
 *
 * Allows the business owner to update their first and last name.
 * Email is displayed read-only. Uses React Hook Form with validation.
 * Matches the visual style of the send-request screen.
 *
 * Requirements: 10.1, 10.2, 16.1
 */
export default function EditProfileScreen() {
  const businessProfileRepo = useService('businessProfile');
  const { data: profile } = useBusinessProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditProfileFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
    },
    mode: 'onChange',
  });

  // Pre-fill form when profile data is available
  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
      });
    }
  }, [profile, reset]);

  // ─── Save Handler ────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: EditProfileFormData) => {
      if (!profile?.id) {
        setErrorMessage('Profile not loaded. Please try again.');
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      const result = await businessProfileRepo.update(profile.id, {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });

      setIsSaving(false);

      if (result.success) {
        router.back();
      } else {
        setErrorMessage(
          result.error.message || 'Failed to save profile. Please try again.',
        );
      }
    },
    [profile, businessProfileRepo],
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-12"
        keyboardShouldPersistTaps="handled"
      >
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
              Edit Profile
            </Text>
          </View>
          <Text className="text-sm text-white/60 mt-2 ml-10">
            Update your personal information
          </Text>
        </View>

        {/* White Card Content */}
        <View className="rounded-t-3xl bg-white px-6 pt-8 pb-6 -mt-4">
          {/* Error Message */}
          {errorMessage && (
            <View className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <Text className="text-sm text-red-600">{errorMessage}</Text>
            </View>
          )}

          {/* First Name Input */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-navy mb-2">
              First Name
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-card-bg px-4 ${
                errors.firstName ? 'border-red-500' : 'border-light-gray'
              }`}
            >
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="firstName"
                rules={{
                  required: 'First name is required',
                  minLength: {
                    value: 1,
                    message: 'First name is required',
                  },
                  maxLength: {
                    value: 50,
                    message: 'First name must be 50 characters or less',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body text-navy"
                    placeholder="First name"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    maxLength={50}
                    autoCapitalize="words"
                    accessibilityLabel="First Name"
                  />
                )}
              />
            </View>
            {errors.firstName?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.firstName.message}
              </Text>
            )}
          </View>

          {/* Last Name Input */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-navy mb-2">
              Last Name
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-card-bg px-4 ${
                errors.lastName ? 'border-red-500' : 'border-light-gray'
              }`}
            >
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="lastName"
                rules={{
                  required: 'Last name is required',
                  minLength: {
                    value: 1,
                    message: 'Last name is required',
                  },
                  maxLength: {
                    value: 50,
                    message: 'Last name must be 50 characters or less',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body text-navy"
                    placeholder="Last name"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    maxLength={50}
                    autoCapitalize="words"
                    accessibilityLabel="Last Name"
                  />
                )}
              />
            </View>
            {errors.lastName?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.lastName.message}
              </Text>
            )}
          </View>

          {/* Email (Read-only) */}
          <View className="mb-8">
            <Text className="text-sm font-medium text-navy mb-2">
              Email
            </Text>
            <View className="flex-row items-center border border-light-gray rounded-xl bg-card-bg px-4 opacity-60">
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <Text className="flex-1 ml-3 py-4 text-body text-navy">
                {profile?.email || '—'}
              </Text>
            </View>
            <Text className="text-caption text-navy/50 mt-1">
              Email cannot be changed
            </Text>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSaving}
            className={`rounded-xl py-4 items-center flex-row justify-center ${
              isSaving ? 'bg-teal/40' : 'bg-teal'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Save Profile"
            accessibilityState={{ disabled: isSaving }}
          >
            {isSaving ? (
              <LoadingIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-body font-bold text-white">
                  Save Profile
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
