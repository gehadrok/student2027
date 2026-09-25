/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenService, TokenPayload } from './TokenService';
import { LoggerFactory } from '../logging/LoggerFactory';

const SESSION_KEY = 'al_salam_session_v2';

export interface Session {
  user: TokenPayload;
  token: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

/**
 * Session service — manages user sessions in the browser.
 */
export class SessionService {
  private readonly tokenService: TokenService;
  private readonly logger = LoggerFactory.getInstance('Session');
  private readonly timeoutMinutes: number;

  constructor(tokenService?: TokenService, timeoutMinutes?: number) {
    this.tokenService = tokenService || new TokenService();
    this.timeoutMinutes = timeoutMinutes || 30;
  }

  /**
   * Create a new session for a user.
   */
  async create(user: Omit<TokenPayload, 'iat' | 'exp'>): Promise<Session> {
    const token = await this.tokenService.generate(user);
    const now = new Date().toISOString();
    const decoded = this.tokenService.decode(token);

    const session: Session = {
      user: decoded || { ...user, iat: 0, exp: 0 },
      token,
      createdAt: now,
      lastActivity: now,
      expiresAt: decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : new Date(Date.now() + this.timeoutMinutes * 60 * 1000).toISOString(),
    };

    this.persist(session);
    this.logger.info(`Session created for user: ${user.name}`);
    return session;
  }

  /**
   * Get the current session.
   */
  async get(): Promise<Session | null> {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw) as Session;

      // Check timeout
      const lastActivity = new Date(session.lastActivity).getTime();
      const now = Date.now();
      const elapsed = (now - lastActivity) / (1000 * 60);

      if (elapsed > this.timeoutMinutes) {
        this.destroy();
        this.logger.warn('Session timed out');
        return null;
      }

      // Verify token
      const verified = await this.tokenService.verify(session.token);
      if (!verified) {
        this.destroy();
        this.logger.warn('Session token invalid');
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Update the last activity timestamp.
   */
  async touch(): Promise<void> {
    const session = await this.get();
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.persist(session);
    }
  }

  /**
   * Destroy the current session.
   */
  destroy(): void {
    localStorage.removeItem(SESSION_KEY);
    this.logger.info('Session destroyed');
  }

  /**
   * Check if a session exists and is valid.
   */
  async isAuthenticated(): Promise<boolean> {
    return (await this.get()) !== null;
  }

  /**
   * Get the current user from the session.
   */
  async getCurrentUser(): Promise<TokenPayload | null> {
    const session = await this.get();
    return session?.user || null;
  }

  /**
   * Check if the current user has a specific role.
   */
  async hasRole(role: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === role;
  }

  private persist(session: Session): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
