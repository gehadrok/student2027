/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IStorageProvider } from '../contracts/IStorageProvider';
import { FileStorageError } from '../errors/AppError';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * LocalStorage-based storage provider.
 * Used for storing small files (settings, configs, images as base64).
 * Future: will be replaced by cloud storage (S3, MinIO, etc.) for real deployments.
 */
export class LocalStorageProvider implements IStorageProvider {
  private readonly prefix: string;
  private readonly logger = LoggerFactory.getInstance('Storage');

  constructor(prefix: string = 'al_salam_storage_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async save(key: string, data: Blob | ArrayBuffer | string): Promise<string> {
    try {
      let serialized: string;
      if (typeof data === 'string') {
        serialized = data;
      } else if (data instanceof Blob) {
        serialized = await data.text();
      } else {
        // ArrayBuffer
        const bytes = new Uint8Array(data);
        serialized = new TextDecoder().decode(bytes);
      }

      localStorage.setItem(this.getKey(key), serialized);
      this.logger.info(`Saved storage key: ${key}`);
      return key;
    } catch (err: any) {
      throw new FileStorageError(`Failed to save "${key}": ${err.message}`);
    }
  }

  async read(key: string): Promise<Blob | null> {
    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) return null;
      return new Blob([raw], { type: 'application/octet-stream' });
    } catch (err: any) {
      throw new FileStorageError(`Failed to read "${key}": ${err.message}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const exists = await this.exists(key);
      if (exists) {
        localStorage.removeItem(this.getKey(key));
        this.logger.info(`Deleted storage key: ${key}`);
        return true;
      }
      return false;
    } catch (err: any) {
      throw new FileStorageError(`Failed to delete "${key}": ${err.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    const fullPrefix = this.getKey(prefix);

    for (let i = 0; i < localStorage.length; i++) {
      const localStorageKey = localStorage.key(i);
      if (localStorageKey && localStorageKey.startsWith(fullPrefix)) {
        keys.push(localStorageKey.substring(this.prefix.length));
      }
    }

    return keys;
  }

  getUrl(key: string): string {
    const raw = localStorage.getItem(this.getKey(key));
    if (raw) {
      // For images and other viewable content, create a data URL
      return `data:text/plain;base64,${btoa(raw)}`;
    }
    return '';
  }
}
