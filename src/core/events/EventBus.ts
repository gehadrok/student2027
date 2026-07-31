/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IEventBus, EventHandler } from '../contracts/IEventBus';

/**
 * In-memory event bus — publish/subscribe pattern.
 * Enables loose coupling between modules.
 * Future: can be replaced with a distributed event bus (RabbitMQ, Kafka, etc.)
 */
export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  publish<T = any>(eventName: string, payload: T): void {
    const handlers = this.handlers.get(eventName);
    if (!handlers || handlers.size === 0) return;

    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${eventName}":`, err);
      }
    });
  }

  subscribe<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventName, handler);
    };
  }

  unsubscribe<T = any>(eventName: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventName);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get the number of subscribers for an event (debugging).
   */
  subscriberCount(eventName: string): number {
    return this.handlers.get(eventName)?.size || 0;
  }

  /**
   * Get all registered event names.
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}
