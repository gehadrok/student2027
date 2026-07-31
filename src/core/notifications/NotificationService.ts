/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INotificationProvider, NotificationPayload } from '../contracts/INotificationProvider';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Notification service — application-level notification management.
 * Routes notifications to all registered providers.
 */
export class NotificationService {
  private providers: INotificationProvider[] = [];
  private readonly logger = LoggerFactory.getInstance('Notification');

  constructor(providers?: INotificationProvider[]) {
    if (providers) {
      this.providers = providers;
    }
  }

  registerProvider(provider: INotificationProvider): void {
    this.providers.push(provider);
    this.logger.info(`Registered notification provider: ${provider.getProviderName()}`);
  }

  unregisterProvider(providerName: string): void {
    const index = this.providers.findIndex((p) => p.getProviderName() === providerName);
    if (index >= 0) {
      this.providers.splice(index, 1);
      this.logger.info(`Unregistered notification provider: ${providerName}`);
    }
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (this.providers.length === 0) {
      this.logger.warn('No notification providers registered');
      return false;
    }

    let allSucceeded = true;
    for (const provider of this.providers) {
      try {
        const result = await provider.send(payload);
        if (!result) {
          this.logger.warn(`Provider ${provider.getProviderName()} failed to send notification`);
          allSucceeded = false;
        }
      } catch (err) {
        this.logger.error(`Provider ${provider.getProviderName()} error:`, err);
        allSucceeded = false;
      }
    }

    return allSucceeded;
  }

  async sendBulk(payloads: NotificationPayload[]): Promise<number> {
    if (this.providers.length === 0) {
      this.logger.warn('No notification providers registered');
      return 0;
    }

    let totalSent = 0;
    for (const provider of this.providers) {
      try {
        const sent = await provider.sendBulk(payloads);
        totalSent += sent;
      } catch (err) {
        this.logger.error(`Provider ${provider.getProviderName()} bulk error:`, err);
      }
    }

    return totalSent;
  }

  getProviders(): string[] {
    return this.providers.map((p) => p.getProviderName());
  }
}
