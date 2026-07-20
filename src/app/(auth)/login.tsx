import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Pressable,
  Image,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useService } from "@/services";
import { ErrorCode } from "@/types";

// ─── Login Form Schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Forgot Password Schema ──────────────────────────────────────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ─── Login Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const authService = useService("auth");

  // ─── Login State ────────────────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // ─── Forgot Password State ─────────────────────────────────────────────────

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(
    null
  );

  // ─── Login Form ────────────────────────────────────────────────────────────

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // ─── Forgot Password Form ─────────────────────────────────────────────────

  const {
    control: forgotControl,
    handleSubmit: handleForgotSubmit,
    reset: resetForgotForm,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // ─── Lockout Countdown Timer ───────────────────────────────────────────────

  useEffect(() => {
    if (!lockoutEndTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((lockoutEndTime - Date.now()) / 60000)
      );
      setLockoutRemaining(remaining);

      if (remaining <= 0) {
        setLockoutEndTime(null);
        setLoginError(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutEndTime]);

  // ─── Login Handler ─────────────────────────────────────────────────────────

  const onLogin = useCallback(
    async (data: LoginFormData) => {
      if (lockoutEndTime && Date.now() < lockoutEndTime) return;

      setIsLoading(true);
      setLoginError(null);

      const result = await authService.signIn({
        email: data.email,
        password: data.password,
      });

      setIsLoading(false);

      if (result.success) {
        router.replace("/(tabs)");
        return;
      }

      const { error } = result;

      if (error.code === ErrorCode.RATE_LIMIT) {
        const lockoutMs = 30 * 60 * 1000;
        const endTime = Date.now() + lockoutMs;
        setLockoutEndTime(endTime);
        setLockoutRemaining(30);
        setLoginError(
          `Too many attempts. Try again in ${30} minutes.`
        );
        return;
      }

      if (
        error.message.toLowerCase().includes("verification") ||
        error.message.toLowerCase().includes("not confirmed") ||
        error.message.toLowerCase().includes("email not confirmed")
      ) {
        setLoginError("Please verify your email before logging in.");
        return;
      }

      setLoginError("Invalid email or password.");
    },
    [authService, lockoutEndTime, router]
  );

  // ─── Forgot Password Handler ──────────────────────────────────────────────

  const onForgotPassword = useCallback(
    async (data: ForgotPasswordFormData) => {
      setForgotPasswordLoading(true);
      setForgotPasswordError(null);

      const result = await authService.requestPasswordReset(data.email);

      setForgotPasswordLoading(false);

      if (result.success) {
        setForgotPasswordSuccess(true);
      } else {
        setForgotPasswordError(
          "Unable to send reset link. Please try again."
        );
      }
    },
    [authService]
  );

  // ─── Close Forgot Password Modal ──────────────────────────────────────────

  const closeForgotPasswordModal = useCallback(() => {
    setShowForgotPassword(false);
    setForgotPasswordSuccess(false);
    setForgotPasswordError(null);
    resetForgotForm();
  }, [resetForgotForm]);

  // ─── Lockout Active Check ──────────────────────────────────────────────────

  const isLockedOut = lockoutEndTime !== null && Date.now() < lockoutEndTime;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Brand Section - Navy background */}
        <View className="items-center pt-20 pb-12 px-6">
          {/* App Icon */}
          <View className="mb-5 h-20 w-20 rounded-2xl overflow-hidden">
            <Image
              source={require("../../../assets/applogo.png")}
              className="h-20 w-20"
              resizeMode="cover"
            />
          </View>
          <Text className="text-3xl font-bold text-white tracking-tight">
            Nudgli
          </Text>
          <Text className="mt-3 text-center text-base text-white/60">
            More reviews, less effort
          </Text>
        </View>

        {/* Form Card - White rounded card */}
        <View className="flex-1 rounded-t-3xl bg-white px-6 pt-8 pb-12">
          <Text className="mb-6 text-center text-lg font-semibold text-navy">
            Welcome back
          </Text>

          {/* Error Message */}
          {loginError && (
            <View className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <Text className="text-sm text-red-700">
                {isLockedOut
                  ? `Too many attempts. Try again in ${lockoutRemaining} minute${lockoutRemaining !== 1 ? "s" : ""}.`
                  : loginError}
              </Text>
            </View>
          )}

          {/* Email Field */}
          <View className="mb-5">
            <Text className="mb-2 text-sm font-medium text-navy">
              Email
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="rounded-xl border border-light-gray bg-card-bg px-4 py-4 text-body text-navy"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isLockedOut}
                  accessibilityLabel="Email address"
                />
              )}
            />
            {errors.email && (
              <Text className="mt-1 text-caption text-red-600">
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Password Field */}
          <View className="mb-3">
            <Text className="mb-2 text-sm font-medium text-navy">
              Password
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="rounded-xl border border-light-gray bg-card-bg px-4 py-4 text-body text-navy"
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isLockedOut}
                  accessibilityLabel="Password"
                />
              )}
            />
            {errors.password && (
              <Text className="mt-1 text-caption text-red-600">
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => setShowForgotPassword(true)}
            className="mb-8 self-end"
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text className="text-sm font-medium text-teal">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleSubmit(onLogin)}
            disabled={isLoading || isLockedOut}
            className={`rounded-xl py-4 ${
              isLoading || isLockedOut
                ? "bg-teal/50"
                : "bg-teal"
            }`}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: isLoading || isLockedOut }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-center text-body font-bold text-white">
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="my-6 flex-row items-center">
            <View className="flex-1 h-px bg-light-gray" />
            <Text className="mx-4 text-caption text-gray-400">or</Text>
            <View className="flex-1 h-px bg-light-gray" />
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            className="rounded-xl border-2 border-navy py-4"
            accessibilityRole="link"
            accessibilityLabel="Create account"
          >
            <Text className="text-center text-body font-bold text-navy">
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Privacy & Terms Links */}
          <View className="flex-row justify-center mt-6 gap-3">
            <TouchableOpacity
              onPress={() => Linking.openURL('https://nudgli.app/privacy')}
              accessibilityRole="link"
            >
              <Text className="text-caption text-gray-400 underline">Privacy Policy</Text>
            </TouchableOpacity>
            <Text className="text-caption text-gray-300">·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://nudgli.app/terms')}
              accessibilityRole="link"
            >
              <Text className="text-caption text-gray-400 underline">Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForgotPasswordModal}
      >
        <View className="flex-1 bg-white px-6 pt-12">
          {/* Modal Header */}
          <View className="mb-8 flex-row items-center justify-between">
            <Text className="text-heading font-bold text-navy">
              Reset Password
            </Text>
            <Pressable
              onPress={closeForgotPasswordModal}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text className="text-body font-medium text-gray-500">
                Close
              </Text>
            </Pressable>
          </View>

          {forgotPasswordSuccess ? (
            <View className="items-center pt-8">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-teal/20">
                <Text className="text-2xl text-teal">✓</Text>
              </View>
              <Text className="mb-2 text-center text-body font-semibold text-navy">
                Check your email
              </Text>
              <Text className="text-center text-body text-gray-500">
                We&apos;ve sent a password reset link to your email address.
                The link will expire in 60 minutes.
              </Text>
              <TouchableOpacity
                onPress={closeForgotPasswordModal}
                className="mt-8 rounded-xl bg-teal px-8 py-4"
                accessibilityRole="button"
                accessibilityLabel="Back to login"
              >
                <Text className="text-body font-bold text-white">
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="mb-6 text-body text-gray-500">
                Enter your email address and we&apos;ll send you a link to
                reset your password.
              </Text>

              {forgotPasswordError && (
                <View className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <Text className="text-sm text-red-700">
                    {forgotPasswordError}
                  </Text>
                </View>
              )}

              <View className="mb-6">
                <Text className="mb-2 text-sm font-medium text-navy">
                  Email
                </Text>
                <Controller
                  control={forgotControl}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="rounded-xl border border-light-gray bg-card-bg px-4 py-4 text-body text-navy"
                      placeholder="you@example.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      accessibilityLabel="Email address for password reset"
                    />
                  )}
                />
              </View>

              <TouchableOpacity
                onPress={handleForgotSubmit(onForgotPassword)}
                disabled={forgotPasswordLoading}
                className={`rounded-xl py-4 ${
                  forgotPasswordLoading
                    ? "bg-teal/50"
                    : "bg-teal"
                }`}
                accessibilityRole="button"
                accessibilityLabel="Send reset link"
                accessibilityState={{ disabled: forgotPasswordLoading }}
              >
                {forgotPasswordLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-body font-bold text-white">
                    Send Reset Link
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
