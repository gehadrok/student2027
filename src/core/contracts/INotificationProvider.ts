/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NotificationType = 'info' | 'warning' | 'success' | 'danger';

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  userId?: string;
  targetRole?: string;
  link?: string;
}

/**
 * Notification provider interface.
 * Future providers: In-App, Email, SMS, Push, WhatsApp, Desktop.
 */
export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<boolean>;
  sendBulk(payloads: NotificationPayload[]): Promise<number>;
  getProviderName(): string;
}
