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
 * Token service — HMAC-SHA256 signed JWT-like tokens for server-side auth.
 *
 * SECURITY (PG-6):
 *  - Signatures use a real HMAC-SHA256 over `header.body` with a secret that
 *    MUST come from the environment (`AUTH_SECRET`). There is NO hardcoded
 *    fallback secret in source (the prior "simulated" signature was removed).
 *  - If `AUTH_SECRET` is absent, an ephemeral per-process secret is generated
 *    and a warning logged; this keeps `npm run dev` bootable without silently
 *    shipping a known credential. Production MUST set `AUTH_SECRET`.
 *
 * PORTABILITY: uses the Web Crypto global (`crypto.subtle` / `crypto.getRandomValues`)
 * so the same module is safe in both Node and the browser bundle.
 */
export class TokenService {
  private readonly logger = LoggerFactory.getInstance('Token');
  private readonly secret: string;
  private readonly expiryMinutes: number;

  constructor(secret?: string, expiryMinutes?: number) {
    const fromEnv = secret || process.env.AUTH_SECRET;
    if (fromEnv) {
      this.secret = fromEnv;
    } else {
      this.secret = randomBytesHex(32);
      this.logger.warn('AUTH_SECRET not set; using ephemeral in-process secret. Set AUTH_SECRET in production.');
    }
    this.expiryMinutes = expiryMinutes || Number(process.env.AUTH_EXPIRY_MINUTES) || 60;
  }

  async generate(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const full: TokenPayload = { ...payload, iat: now, exp: now + this.expiryMinutes * 60 };
    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64urlEncode(JSON.stringify(full));
    const signature = await this.sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  async verify(token: string): Promise<TokenPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const expected = await this.sign(`${header}.${body}`);
      if (signature.length !== expected.length || signature !== expected) return null;
      const decoded = JSON.parse(b64urlDecode(body)) as TokenPayload;
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

  decode(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(b64urlDecode(parts[1])) as TokenPayload;
    } catch {
      return null;
    }
  }

  isExpired(token: string): boolean {
    const decoded = this.decode(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp < Math.floor(Date.now() / 1000);
  }

  private async sign(data: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(this.secret),
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return bufToB64url(signature);
  }
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytesHex(n: number): string {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
