/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventHandler<T = any> = (payload: T) => void;

/**
 * Event bus interface — publish/subscribe pattern.
 * Enables loose coupling between modules.
 * No module should directly call another module when an event is appropriate.
 */
export interface IEventBus {
  publish<T = any>(eventName: string, payload: T): void;
  subscribe<T = any>(eventName: string, handler: EventHandler<T>): () => void;
  unsubscribe<T = any>(eventName: string, handler: EventHandler<T>): void;
  clear(): void;
}
