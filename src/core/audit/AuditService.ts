/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAuditProvider, AuditEntry } from './IAuditProvider';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * LocalStorage-based audit provider.
 * Stores audit entries in localStorage as a fallback.
 * In production, replace with a real database-backed provider.
 */
class LocalStorageAuditProvider implements IAuditProvider {
  private readonly storageKey = 'al_salam_audit_logs';
  private readonly logger = LoggerFactory.getInstance('Audit');

  private getAll(): AuditEntry[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveAll(entries: AuditEntry[]): void {
    try {
      // Keep max 500 entries
      const trimmed = entries.slice(-500);
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch (err) {
      this.logger.error('Failed to persist audit logs:', err);
    }
  }

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    const all = this.getAll();
    all.push(fullEntry);
    this.saveAll(all);

    this.logger.info(`Audit: ${entry.action} by ${entry.userName}`);
  }

  getRecent(limit: number = 50): AuditEntry[] {
    const all = this.getAll();
    return all.reverse().slice(0, limit);
  }

  getByUser(userId: string, limit: number = 50): AuditEntry[] {
    const all = this.getAll();
    return all
      .filter((e) => e.userId === userId)
      .reverse()
      .slice(0, limit);
  }

  getByAction(action: string, limit: number = 50): AuditEntry[] {
    const all = this.getAll();
    return all
      .filter((e) => e.action.includes(action))
      .reverse()
      .slice(0, limit);
  }

  getByDateRange(from: string, to: string, limit: number = 50): AuditEntry[] {
    const all = this.getAll();
    return all
      .filter((e) => e.timestamp >= from && e.timestamp <= to)
      .reverse()
      .slice(0, limit);
  }
}

/**
 * Audit service — application-level audit log management.
 */
export class AuditService {
  private provider: IAuditProvider;
  private readonly logger = LoggerFactory.getInstance('AuditService');

  constructor(provider?: IAuditProvider) {
    this.provider = provider || new LocalStorageAuditProvider();
  }

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    this.provider.log(entry);
  }

  getRecent(limit: number = 50): AuditEntry[] {
    return this.provider.getRecent(limit);
  }

  getByUser(userId: string, limit: number = 50): AuditEntry[] {
    return this.provider.getByUser(userId, limit);
  }

  getByAction(action: string, limit: number = 50): AuditEntry[] {
    return this.provider.getByAction(action, limit);
  }

  getByDateRange(from: string, to: string, limit: number = 50): AuditEntry[] {
    return this.provider.getByDateRange(from, to, limit);
  }
}
