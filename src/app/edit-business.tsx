import { useState, useCallback, useEffect } from 'react';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useService } from '@/services';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

// ─── Validation Schema ───────────────────────────────────────────────────────

const editBusinessSchema = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be 100 characters or less'),
  googleReviewUrl: z
    .string()
    .url('Please enter a valid URL'),
});

type EditBusinessFormData = z.infer<typeof editBusinessSchema>;

// ─── Edit Business Screen ────────────────────────────────────────────────────

/**
 * Edit Business screen.
 *
 * Allows the business owner to update their business name and Google review URL.
 * Uses React Hook Form with Zod validation. Pre-fills from the current business profile.
 *
 * Requirements: 9.1, 9.2, 16.1
 */
export default function EditBusinessScreen() {
  const businessProfileRepo = useService('businessProfile');
  const { data: profile } = useBusinessProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditBusinessFormData>({
    resolver: zodResolver(editBusinessSchema),
    defaultValues: {
      businessName: '',
      googleReviewUrl: '',
    },
    mode: 'onChange',
  });

  // Pre-fill form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        businessName: profile.businessName ?? '',
        googleReviewUrl: profile.googleReviewUrl ?? '',
      });
    }
  }, [profile, reset]);

  // ─── Save Handler ──────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: EditBusinessFormData) => {
      if (!profile?.id) {
        setErrorMessage('Business profile not loaded. Please try again.');
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      const result = await businessProfileRepo.update(profile.id, {
        businessName: data.businessName,
        googleReviewUrl: data.googleReviewUrl,
      });

      setIsSaving(false);

      if (result.success) {
        router.back();
      } else {
        setErrorMessage(
          result.error.message || 'Failed to save changes. Please try again.',
        );
      }
    },
    [profile, businessProfileRepo],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

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
              Edit Business
            </Text>
          </View>
          <Text className="text-sm text-white/60 mt-2 ml-10">
            Update your business name and Google review link
          </Text>
        </View>

        {/* White Card Content */}
        <View className="rounded-t-3xl bg-white px-6 pt-8 pb-6 -mt-4">
          {/* Error Message */}
          {errorMessage && (
            <View className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <Text className="text-sm text-red-700">{errorMessage}</Text>
            </View>
          )}

          {/* Business Name Input */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-navy mb-2">
              Business Name
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-card-bg px-4 ${
                errors.businessName ? 'border-red-500' : 'border-light-gray'
              }`}
            >
              <Ionicons name="business-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="businessName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body text-navy"
                    placeholder="Your Business Name"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    maxLength={100}
                    autoCapitalize="words"
                    accessibilityLabel="Business Name"
                  />
                )}
              />
            </View>
            {errors.businessName?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.businessName.message}
              </Text>
            )}
          </View>

          {/* Google Review URL Input */}
          <View className="mb-8">
            <Text className="text-sm font-medium text-navy mb-2">
              Google Review URL
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-card-bg px-4 ${
                errors.googleReviewUrl ? 'border-red-500' : 'border-light-gray'
              }`}
            >
              <Ionicons name="link-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="googleReviewUrl"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body text-navy"
                    placeholder="https://g.page/r/your-business/review"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    accessibilityLabel="Google Review URL"
                  />
                )}
              />
            </View>
            {errors.googleReviewUrl?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.googleReviewUrl.message}
              </Text>
            )}
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSaving}
            className={`rounded-xl py-4 items-center flex-row justify-center ${
              isSaving ? 'bg-teal/40' : 'bg-teal'
            }`}
            accessibilityRole="button"
            accessibilityLabel="Save Changes"
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
                  Save Changes
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
