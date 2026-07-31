/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerFactory } from '../logging/LoggerFactory';

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Token service — JWT-like token management for client-side auth.
 * In production, replace with real JWT via backend verification.
 */
export class TokenService {
  private readonly logger = LoggerFactory.getInstance('Token');
  private readonly secret: string;
  private readonly expiryMinutes: number;

  constructor(secret?: string, expiryMinutes?: number) {
    this.secret = secret || 'al-salam-school-jwt-secret-key';
    this.expiryMinutes = expiryMinutes || 60;
  }

  /**
   * Generate a signed token (simulated JWT).
   */
  generate(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.expiryMinutes * 60,
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(tokenPayload));
    const signature = this.createSignature(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify and decode a token.
   */
  verify(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, body, signature] = parts;
      const expectedSig = this.createSignature(`${header}.${body}`);

      if (signature !== expectedSig) return null;

      const decoded = JSON.parse(atob(body)) as TokenPayload;

      // Check expiry
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        this.logger.warn('Token expired');
        return null;
      }

      return decoded;
    } catch (err) {
      this.logger.error('Token verification failed:', err);
      return null;
    }
  }

  /**
   * Decode a token without verification (for display purposes only).
   */
  decode(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1])) as TokenPayload;
    } catch {
      return null;
    }
  }

  private createSignature(data: string): string {
    // Simple HMAC simulation — REPLACE with real HMAC-SHA256 in production
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return btoa(String(hash) + this.secret);
  }

  /**
   * Check if a token is expired.
   */
  isExpired(token: string): boolean {
    const decoded = this.decode(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp < Math.floor(Date.now() / 1000);
  }
}
