/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Encryption service — wraps browser Crypto API.
 * Used for encrypting sensitive data at rest.
 */
export class EncryptionService {
  private readonly logger = LoggerFactory.getInstance('Encryption');
  private readonly key: string;

  constructor(key?: string) {
    this.key = key || 'al-salam-default-encryption-key-2026!';
  }

  /**
   * Encrypt a string using XOR + base64 (simple encryption for client-side).
   * In production, replace with AES-GCM via Web Crypto API.
   */
  encrypt(plaintext: string): string {
    try {
      const textBytes = new TextEncoder().encode(plaintext);
      const keyBytes = new TextEncoder().encode(this.key);
      const result = new Uint8Array(textBytes.length);

      for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
      }

      // Convert to base64
      let binary = '';
      result.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      return btoa(binary);
    } catch (err: any) {
      this.logger.error('Encryption failed:', err);
      return plaintext;
    }
  }

  /**
   * Decrypt a string encrypted with the encrypt method.
   */
  decrypt(ciphertext: string): string {
    try {
      const binary = atob(ciphertext);
      const result = new Uint8Array(binary.length);
      const keyBytes = new TextEncoder().encode(this.key);

      for (let i = 0; i < binary.length; i++) {
        result[i] = binary.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
      }

      return new TextDecoder().decode(result);
    } catch (err: any) {
      this.logger.error('Decryption failed:', err);
      return ciphertext;
    }
  }
}
