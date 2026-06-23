/**
 * Push notification service interface.
 * Abstracts device registration, permission handling, and notification reception.
 */

import type {
  Result,
  NotificationPermissionStatus,
  AppNotification,
  Unsubscribe,
} from '@/types';

export interface INotificationService {
  registerDevice(token: string, userId: string): Promise<Result<void>>;
  requestPermission(): Promise<NotificationPermissionStatus>;
  getPermissionStatus(): Promise<NotificationPermissionStatus>;
  onNotificationReceived(callback: (notification: AppNotification) => void): Unsubscribe;
}
