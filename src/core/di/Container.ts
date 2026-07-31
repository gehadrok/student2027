/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerFactory } from '../logging/LoggerFactory';
import { ConfigurationError } from '../errors/AppError';

type Lifetime = 'singleton' | 'transient' | 'scoped';

interface Registration {
  factory: () => any;
  instance?: any;
  lifetime: Lifetime;
}

/**
 * Simple DI Container — the Composition Root.
 * All infrastructure services must be registered here.
 * No module may instantiate infrastructure directly.
 */
export class Container {
  private static instance: Container;
  private registrations = new Map<string, Registration>();
  private readonly logger = LoggerFactory.getInstance('Container');

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Register a service.
   */
  register<T>(name: string, factory: () => T, lifetime: Lifetime = 'singleton'): void {
    if (this.registrations.has(name)) {
      this.logger.warn(`Service "${name}" is already registered. Overwriting.`);
    }
    this.registrations.set(name, { factory, lifetime });
    this.logger.debug(`Registered service: ${name} (${lifetime})`);
  }

  /**
   * Register a singleton instance directly.
   */
  registerInstance<T>(name: string, instance: T): void {
    this.registrations.set(name, {
      factory: () => instance,
      instance,
      lifetime: 'singleton',
    });
    this.logger.debug(`Registered singleton instance: ${name}`);
  }

  /**
   * Get a service from the container.
   */
  resolve<T>(name: string): T {
    const registration = this.registrations.get(name);
    if (!registration) {
      throw new ConfigurationError(`Service "${name}" is not registered. Register it in bootstrap first.`);
    }

    if (registration.lifetime === 'singleton') {
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      return registration.instance as T;
    }

    // Transient and scoped create new instances each time
    return registration.factory() as T;
  }

  /**
   * Check if a service is registered.
   */
  has(name: string): boolean {
    return this.registrations.has(name);
  }

  /**
   * Get all registered service names.
   */
  getRegisteredServices(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Clear all registrations (useful for testing).
   */
  clear(): void {
    this.registrations.clear();
    this.logger.info('Container cleared');
  }

  /**
   * Reset singleton instance.
   */
  static reset(): void {
    Container.instance = new Container();
  }
}
