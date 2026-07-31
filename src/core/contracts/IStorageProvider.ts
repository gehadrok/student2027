/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generic storage provider interface.
 * All storage implementations (LocalStorage, MinIO, S3, Azure, GCS) must implement this.
 */
export interface IStorageProvider {
  save(key: string, data: Blob | ArrayBuffer | string): Promise<string>;
  read(key: string): Promise<Blob | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  getUrl(key: string): string;
}
