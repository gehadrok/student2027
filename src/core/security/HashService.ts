/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Hash service — provides hashing and HMAC operations.
 * Uses Web Crypto API (SHA-256).
 */
export class HashService {
  private readonly logger = LoggerFactory.getInstance('Hash');

  /**
   * Generate SHA-256 hash of a string.
   */
  async hash(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      return this.bufferToHex(hashBuffer);
    } catch (err: any) {
      this.logger.error('Hashing failed:', err);
      return '';
    }
  }

  /**
   * Generate HMAC-SHA256 signature.
   */
  async hmac(data: string, secret: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
      return this.bufferToHex(signature);
    } catch (err: any) {
      this.logger.error('HMAC failed:', err);
      return '';
    }
  }

  /**
   * Compare a plaintext string against a hash.
   */
  async verify(plaintext: string, hash: string): Promise<boolean> {
    const computedHash = await this.hash(plaintext);
    return computedHash === hash;
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate a cryptographically secure random string.
   */
  generateRandomString(length: number = 32): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, length);
  }

  /**
   * Generate a random numeric code (for OTP, verification codes).
   */
  generateOTP(length: number = 6): string {
    const max = Math.pow(10, length);
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const num = randomBytes[0] % max;
    return String(num).padStart(length, '0');
  }
}
