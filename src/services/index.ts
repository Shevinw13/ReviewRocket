/**
 * Service registry with React context-based dependency injection.
 * Provides a ServiceProvider component and useService hook for retrieving
 * service implementations by key, decoupling consumers from concrete adapters.
 */

import React, { createContext, useContext } from 'react';

import type { IAuthService } from './interfaces/auth.service';
import type {
  IReviewRequestRepository,
  IFeedbackRepository,
  IBusinessProfileRepository,
} from './interfaces/database.service';
import type { ISmsService } from './interfaces/sms.service';
import type { INotificationService } from './interfaces/notification.service';
import type { IMonitoringService } from './interfaces/monitoring.service';
import type { IAnalyticsService } from './interfaces/analytics.service';
import type { IInboxItemRepository } from './interfaces/inbox-item.service';

// ─── Service Registry Type ───────────────────────────────────────────────────

/** Maps service keys to their corresponding interface types. */
export interface ServiceRegistry {
  auth: IAuthService;
  reviewRequests: IReviewRequestRepository;
  feedback: IFeedbackRepository;
  businessProfile: IBusinessProfileRepository;
  sms: ISmsService;
  notifications: INotificationService;
  monitoring: IMonitoringService;
  analytics: IAnalyticsService;
  inboxItems: IInboxItemRepository;
}

// ─── React Context ───────────────────────────────────────────────────────────

const ServiceContext = createContext<ServiceRegistry | null>(null);

// ─── ServiceProvider ─────────────────────────────────────────────────────────

export interface ServiceProviderProps {
  services: ServiceRegistry;
  children: React.ReactNode;
}

/**
 * Provides concrete service implementations to the component tree.
 * Wrap your app root (or a subtree) with this component and pass in
 * the implementations for each service interface.
 */
export function ServiceProvider({ services, children }: ServiceProviderProps) {
  return React.createElement(ServiceContext.Provider, { value: services }, children);
}

// ─── useService Hook ─────────────────────────────────────────────────────────

/**
 * Retrieves a service implementation by key from the nearest ServiceProvider.
 *
 * @example
 * const authService = useService('auth');
 * const smsService = useService('sms');
 */
export function useService<K extends keyof ServiceRegistry>(key: K): ServiceRegistry[K] {
  const registry = useContext(ServiceContext);
  if (!registry) {
    throw new Error(
      `useService("${key}") was called outside of a <ServiceProvider>. ` +
        'Wrap your component tree with <ServiceProvider services={...}>.',
    );
  }
  return registry[key];
}

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { IAuthService } from './interfaces/auth.service';
export type {
  IReviewRequestRepository,
  IFeedbackRepository,
  IBusinessProfileRepository,
} from './interfaces/database.service';
export type { ISmsService } from './interfaces/sms.service';
export type { INotificationService } from './interfaces/notification.service';
export type { IMonitoringService, ErrorContext, Breadcrumb } from './interfaces/monitoring.service';
export type { IAnalyticsService, AnalyticsEvent } from './interfaces/analytics.service';
export type { IInboxItemRepository } from './interfaces/inbox-item.service';
