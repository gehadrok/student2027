/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IStorageProvider } from '../contracts/IStorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';

/**
 * Storage factory — creates and manages storage provider instances.
 */
export class StorageFactory {
  private static instance: IStorageProvider | null = null;

  static getInstance(type: 'local' | 's3' | 'minio' = 'local'): IStorageProvider {
    if (!StorageFactory.instance) {
      StorageFactory.instance = StorageFactory.createProvider(type);
    }
    return StorageFactory.instance;
  }

  static createProvider(type: 'local' | 's3' | 'minio' = 'local'): IStorageProvider {
    switch (type) {
      case 'local':
      default:
        return new LocalStorageProvider();
      // Future:
      // case 's3':
      //   return new S3StorageProvider();
      // case 'minio':
      //   return new MinIOStorageProvider();
    }
  }

  static reset(): void {
    StorageFactory.instance = null;
  }

  static setInstance(instance: IStorageProvider): void {
    StorageFactory.instance = instance;
  }
}
