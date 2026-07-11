import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';

import { sendRequestSchema, type SendRequestFormData } from '@/types/schemas';
import { ErrorCode } from '@/types';
import type { AppError } from '@/types';
import { useService } from '@/services';
import { formatPhoneNumber, normalizePhoneNumber } from '@/utils/phone';
import { withRetry } from '@/utils/retry';
import { hapticSuccess, hapticWarning } from '@/utils/haptics';
import { useBusinessProfile } from '@/features/inbox/hooks/useBusinessProfile';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { SuccessIndicator } from '@/components/ui/SuccessIndicator';
import { ErrorIndicator } from '@/components/ui/ErrorIndicator';
import { generateSmsMessage } from '@/utils/smsTemplates';
import { useTheme } from '@/theme/ThemeContext';
import * as Contacts from 'expo-contacts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SuccessState {
  phoneNumber: string;
  customerName?: string;
  serviceType?: string;
}

// ─── Send Request Screen ─────────────────────────────────────────────────────

/**
 * Send Review Request screen.
 *
 * Allows the business owner to send an SMS feedback request to a customer.
 * Uses React Hook Form with Zod validation. Auto-formats phone numbers
 * to (XXX) XXX-XXXX as the user types.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 8.3
 */
export default function SendRequestScreen() {
  const smsService = useService('sms');
  const { data: profile } = useBusinessProfile();
  const { colors: t } = useTheme();
  const businessId = profile?.id;

  const [isSending, setIsSending] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedData, setLastSubmittedData] =
    useState<SendRequestFormData | null>(null);
  const lastSendTime = useRef(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SendRequestFormData>({
    resolver: zodResolver(sendRequestSchema),
    defaultValues: {
      phoneNumber: '',
      customerName: '',
      serviceType: '',
    },
    mode: 'onChange',
  });

  const phoneValue = watch('phoneNumber');
  const customerNameValue = watch('customerName');
  const serviceTypeValue = watch('serviceType');
  const isPhoneValid = phoneValue
    ? normalizePhoneNumber(phoneValue).length === 10
    : false;

  // Generate live message preview
  const messagePreview = generateSmsMessage(
    profile?.businessType,
    profile?.businessName ?? 'Your Business',
    customerNameValue || undefined,
  );

  // ─── Phone Auto-formatting ───────────────────────────────────────────────

  const handlePhoneChange = useCallback(
    (text: string, onChange: (value: string) => void) => {
      // Extract digits only
      const digits = text.replace(/\D/g, '');

      // Auto-format as user types
      let formatted = '';
      if (digits.length === 0) {
        formatted = '';
      } else if (digits.length <= 3) {
        formatted = `(${digits}`;
      } else if (digits.length <= 6) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }

      onChange(formatted);
    },
    [],
  );

  // ─── Contacts Picker ─────────────────────────────────────────────────────

  const handlePickContact = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Contacts Access',
        'To pick a contact, please allow Nudgli access to your contacts in Settings.',
      );
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName, Contacts.Fields.LastName],
      sort: Contacts.SortTypes.FirstName,
    });

    if (data.length === 0) {
      Alert.alert('No Contacts', 'No contacts found on this device.');
      return;
    }

    // Show a simple picker — use the first phone number of each contact
    // For now, pick via Alert (iOS native picker would require more UI)
    // Let's use the presentContactPickerAsync if available, otherwise filter
    const contactsWithPhones = data.filter(
      (c) => c.phoneNumbers && c.phoneNumbers.length > 0,
    ).slice(0, 50); // Limit for performance

    if (contactsWithPhones.length === 0) {
      Alert.alert('No Phone Numbers', 'None of your contacts have phone numbers.');
      return;
    }

    // Pick the first result that matches — for a real app, you'd show a modal list
    // Using Alert for simplicity (works well on iOS)
    const options = contactsWithPhones.slice(0, 10).map((c) => ({
      text: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
      onPress: () => {
        const phone = c.phoneNumbers?.[0]?.number || '';
        const digits = phone.replace(/\D/g, '').slice(-10);
        const formatted = digits.length === 10
          ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
          : phone;
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();

        setValue('phoneNumber', formatted, { shouldValidate: true });
        if (name) {
          setValue('customerName', name, { shouldValidate: true });
        }
      },
    }));

    Alert.alert('Select Contact', 'Choose a customer', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [setValue]);

  // ─── Send Handler ────────────────────────────────────────────────────────

  const sendRequest = useCallback(
    async (data: SendRequestFormData, force = false) => {
      // Double-tap guard: ignore if sent within last 2 seconds
      const now = Date.now();
      if (now - lastSendTime.current < 2000) return;
      lastSendTime.current = now;

      if (!businessId) {
        setErrorMessage('Business profile not loaded. Please try again.');
        return;
      }

      // Network check
      try {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          setErrorMessage('No internet connection. Please check your network and try again.');
          hapticWarning();
          return;
        }
      } catch {
        // If NetInfo fails, proceed anyway — the request will fail naturally
      }

      setIsSending(true);
      setErrorMessage(null);
      setLastSubmittedData(data);

      const result = await withRetry(() =>
        smsService.sendFeedbackRequest({
          phoneNumber: data.phoneNumber,
          customerName: data.customerName || undefined,
          serviceType: data.serviceType || undefined,
          businessId,
        }),
      );

      setIsSending(false);

      if (result.success) {
        // Check for duplicate warning — show dialog with the specific date
        if (result.data.duplicateWarning && !force) {
          const previousDate = result.data.previousRequestDate
            ? new Date(result.data.previousRequestDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'recently';

          Alert.alert(
            'Previous Request Found',
            `You've already requested feedback from this customer on ${previousDate}.\n\nAre you sure you want to send another request?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Send Anyway',
                style: 'destructive',
                onPress: () => sendRequest(data, true),
              },
            ],
          );
          return;
        }

        // Show success confirmation, then navigate back to dashboard
        hapticSuccess();
        setSuccessState({
          phoneNumber: formatPhoneNumber(data.phoneNumber),
          customerName: data.customerName || undefined,
          serviceType: data.serviceType || undefined,
        });
        reset();

        // Navigate back to home after a short delay to show confirmation
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 2500);
      } else {
        const error = result.error as AppError;

        if (error.code === ErrorCode.OPT_OUT) {
          Alert.alert(
            'Unable to Send Request',
            'This customer has opted out of receiving SMS messages. To respect their communication preferences, Nudgli cannot send additional review requests unless they opt back in.',
            [{ text: 'OK', style: 'default' }],
          );
          return;
        }

        if (error.code === ErrorCode.QUOTA_EXCEEDED) {
          // Navigate to subscription tier selection (Req 8.3)
          router.push({ pathname: '/subscription', params: { quotaExceeded: 'true' } });
          return;
        }

        setErrorMessage(
          error.message || 'Failed to send review request. Please try again.',
        );
        hapticWarning();
      }
    },
    [businessId, smsService, reset],
  );

  const onSubmit = useCallback(
    (data: SendRequestFormData) => {
      sendRequest(data);
    },
    [sendRequest],
  );

  const handleRetry = useCallback(() => {
    if (lastSubmittedData) {
      sendRequest(lastSubmittedData);
    }
  }, [lastSubmittedData, sendRequest]);

  const handleSuccessDone = useCallback(() => {
    setSuccessState(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: t.bg }}
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
              Send Review Request
            </Text>
          </View>
          <Text className="text-sm text-white/60 mt-2 ml-10">
            Send a friendly text asking your customer for a 1-5 rating
          </Text>
        </View>

        {/* Card Content */}
        <View className="rounded-t-3xl px-6 pt-8 pb-6 -mt-4" style={{ backgroundColor: t.bg }}>
          {/* How it works hint (shown when form is empty) */}
          {!successState && !errorMessage && !phoneValue && (
            <View className="bg-teal/5 border border-teal/20 rounded-xl p-3 mb-5 flex-row items-start">
              <Ionicons name="information-circle-outline" size={18} color="#0CBFA6" style={{ marginTop: 1 }} />
              <Text className="text-caption navy/70 ml-2 flex-1">
                Your customer will receive a text asking them to rate their experience 1-5. Happy customers get your Google review link. Unhappy ones come directly to you.
              </Text>
            </View>
          )}

          {/* Success State */}
          {successState && (
            <View className="mb-6">
              <SuccessIndicator
                visible={true}
                message="Review request sent!"
                onDone={handleSuccessDone}
                duration={3000}
              />
              <View className="mt-3 bg-card-bg rounded-2xl p-4 border border-light-gray">
                <Text className="text-caption text-navy/60 mb-1">Sent to</Text>
                <Text className="text-body font-medium text-navy">
                  {successState.phoneNumber}
                </Text>
                {successState.customerName && (
                  <>
                    <Text className="text-caption text-navy/60 mt-2 mb-1">
                      Customer
                    </Text>
                    <Text className="text-body font-medium text-navy">
                      {successState.customerName}
                    </Text>
                  </>
                )}
                {successState.serviceType && (
                  <>
                    <Text className="text-caption text-navy/60 mt-2 mb-1">
                      Job Note
                    </Text>
                    <Text className="text-body font-medium text-navy">
                      {successState.serviceType}
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Error State */}
          {errorMessage && (
            <View className="mb-6">
              <ErrorIndicator
                message={errorMessage}
                onRetry={handleRetry}
                onDismiss={() => setErrorMessage(null)}
              />
            </View>
          )}

          {/* Customer Name Input */}
          <View className="mb-5">
            <Text className="text-sm font-medium mb-2" style={{ color: t.text }}>
              Customer Name (optional)
            </Text>
            <View className="flex-row items-center rounded-xl px-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
              <Ionicons name="person-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="customerName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body" style={{ color: t.text }}
                    placeholder="Jane Smith"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    maxLength={50}
                    autoCapitalize="words"
                    accessibilityLabel="Customer Name"
                  />
                )}
              />
            </View>
            {errors.customerName?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.customerName.message}
              </Text>
            )}
          </View>

          {/* Phone Number Input */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium" style={{ color: t.text }}>
                Phone Number
              </Text>
              <Pressable
                onPress={handlePickContact}
                className="flex-row items-center active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel="Pick from contacts"
              >
                <Ionicons name="person-add-outline" size={16} color="#0CBFA6" />
                <Text className="text-caption font-medium text-teal ml-1">
                  Contacts
                </Text>
              </Pressable>
            </View>
            <View
              className="flex-row items-center rounded-xl px-4"
              style={{
                backgroundColor: t.cardBg,
                borderWidth: 1,
                borderColor: errors.phoneNumber ? '#EF4444' : t.border,
              }}
            >
              <Ionicons name="call-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body" style={{ color: t.text }}
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={(text) => handlePhoneChange(text, onChange)}
                    value={value}
                    keyboardType="phone-pad"
                    maxLength={14}
                    accessibilityLabel="Phone Number"
                  />
                )}
              />
            </View>
            {errors.phoneNumber?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.phoneNumber.message}
              </Text>
            )}
          </View>

          {/* Job Note Input */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium" style={{ color: t.text }}>
                Job Note (optional)
              </Text>
              <Text className={`text-caption ${(serviceTypeValue?.length ?? 0) >= 70 ? 'text-amber-500' : 'text-navy/40'}`}>
                {serviceTypeValue?.length ?? 0}/80
              </Text>
            </View>
            <View className="flex-row items-center rounded-xl px-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
              <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
              <Controller
                control={control}
                name="serviceType"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="flex-1 ml-3 py-4 text-body" style={{ color: t.text }}
                    placeholder="e.g. Kitchen faucet, 123 Oak St"
                    placeholderTextColor="#9CA3AF"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    maxLength={80}
                    autoCapitalize="sentences"
                    accessibilityLabel="Job Note"
                  />
                )}
              />
            </View>
            {errors.serviceType?.message && (
              <Text className="text-caption text-red-500 mt-1">
                {errors.serviceType.message}
              </Text>
            )}
          </View>

          {/* Message Preview */}
          <View className="mb-5">
            <Text className="text-sm font-medium mb-2" style={{ color: t.text }}>
              Message Preview
            </Text>
            <View className="rounded-xl p-4" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
              <View className="flex-row items-start mb-2">
                <Ionicons name="chatbubble-outline" size={16} color="#0CBFA6" style={{ marginTop: 2 }} />
                <Text className="text-caption font-medium text-teal ml-2">
                  What your customer will see:
                </Text>
              </View>
              <View className="rounded-lg p-3" style={{ backgroundColor: t.cardBg, borderWidth: 1, borderColor: t.border }}>
                <Text className="text-caption leading-5" style={{ color: t.textSecondary }}>
                  {messagePreview}
                </Text>
              </View>
            </View>
          </View>

          {/* Sender Phone Info */}
          <View className="flex-row items-center mb-4 px-1">
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#6B7280"
            />
            <Text className="text-caption ml-2" style={{ color: t.textMuted }}>
              Your customer will receive a text from (855) 597-7335
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Send Button */}
      <View className="px-6 pb-8 pt-3" style={{ backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border }}>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={!isPhoneValid || isSending}
          className={`rounded-xl py-4 items-center flex-row justify-center ${
            !isPhoneValid || isSending
              ? 'bg-teal/40'
              : 'bg-teal'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Send Text"
          accessibilityState={{ disabled: !isPhoneValid || isSending }}
        >
          {isSending ? (
            <LoadingIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="paper-plane"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text className="text-body font-bold text-white">Send Text</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
