/**
 * ErrorBoundary component for catching unhandled JavaScript exceptions.
 *
 * Uses a class component (required for React error boundaries) wrapped by a
 * functional component that provides the monitoring service via useService.
 *
 * On error:
 * - Captures the exception to the monitoring service (Sentry) with screen name,
 *   device info, and anonymized user ID
 * - Renders a friendly fallback UI with a "Restart" button that navigates to Dashboard
 *
 * Requirements: 11.5, 14.1
 */

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { useService } from "@/services";
import type { IMonitoringService } from "@/services/interfaces/monitoring.service";

// ─── Props & State ───────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional screen name for error context metadata. */
  screenName?: string;
  /** Monitoring service injected from the functional wrapper. */
  monitoringService?: IMonitoringService | null;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// ─── Class-based Error Boundary ──────────────────────────────────────────────

/**
 * React class component that catches unhandled exceptions in its subtree.
 * Must be a class component because React does not support error boundaries
 * via function components / hooks.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { monitoringService, screenName } = this.props;

    if (monitoringService) {
      monitoringService.captureException(error, {
        screenName: screenName ?? "unknown",
        extra: {
          componentStack: errorInfo.componentStack ?? undefined,
        },
      });
    }
  }

  private handleRestart = (): void => {
    this.setState({ hasError: false });
    router.replace("/");
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-card-bg px-6">
          <Text className="text-navy text-2xl font-bold mb-4">
            Something went wrong
          </Text>
          <Text className="text-navy/70 text-base text-center mb-8">
            We're sorry for the inconvenience. An unexpected error occurred.
            Please restart to continue.
          </Text>
          <Pressable
            onPress={this.handleRestart}
            className="bg-rocket-orange rounded-lg px-8 py-4"
            accessibilityRole="button"
            accessibilityLabel="Restart and return to Dashboard"
          >
            <Text className="text-white text-base font-semibold">Restart</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Functional Wrapper ──────────────────────────────────────────────────────

export interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  /** Optional screen name for error context metadata. */
  screenName?: string;
}

/**
 * Functional wrapper that provides the monitoring service from the service
 * registry to the class-based ErrorBoundary.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundaryWrapper screenName="Dashboard">
 *   <DashboardScreen />
 * </ErrorBoundaryWrapper>
 * ```
 */
export function ErrorBoundaryWrapper({
  children,
  screenName,
}: ErrorBoundaryWrapperProps): React.JSX.Element {
  let monitoringService: IMonitoringService | null = null;

  try {
    monitoringService = useService("monitoring");
  } catch {
    // If ServiceProvider is not available (e.g., during tests or early renders),
    // the ErrorBoundary will still catch errors but won't report them.
  }

  return (
    <ErrorBoundary
      monitoringService={monitoringService}
      screenName={screenName}
    >
      {children}
    </ErrorBoundary>
  );
}
