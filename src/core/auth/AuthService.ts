/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAuthProvider, LoginRequest, AuthResult, UserCredentials } from './IAuthProvider';
import { IDataSource } from '../datasource/IDataSource';
import { HashService } from '../security/HashService';
import { TokenService } from '../security/TokenService';
import { LoggerFactory } from '../logging/LoggerFactory';

/**
 * Auth service — manages authentication via configurable provider.
 * Uses IDataSource for user lookups and HashService for password verification.
 */
export class AuthService implements IAuthProvider {
  private dataSource: IDataSource;
  private hashService: HashService;
  private tokenService: TokenService;
  private readonly logger = LoggerFactory.getInstance('Auth');
  private currentUser: UserCredentials | null = null;

  constructor(dataSource: IDataSource, hashService?: HashService, tokenService?: TokenService) {
    this.dataSource = dataSource;
    this.hashService = hashService || new HashService();
    this.tokenService = tokenService || new TokenService();
  }

  async login(request: LoginRequest): Promise<AuthResult> {
    try {
      // Query user by email using IDataSource
      const users = await this.dataSource.query<any>(
        'SELECT id, name, email, role, password_hash FROM users WHERE email = ? AND status = ?',
        [request.email, 'active']
      );

      if (users.length === 0) {
        return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      }

      const user = users[0];
      const isValid = await this.hashService.verify(request.password, user.password_hash);

      if (!isValid) {
        return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      }

      const token = await this.tokenService.generate({
        userId: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      });

      this.currentUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      this.logger.info(`User logged in: ${user.name} (${user.role})`);
      return {
        success: true,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      };
    } catch (err: any) {
      this.logger.error('Login failed:', err);
      return { success: false, error: 'حدث خطأ أثناء تسجيل الدخول' };
    }
  }

  logout(): void {
    this.currentUser = null;
    this.logger.info('User logged out');
  }

  getCurrentUser(): UserCredentials | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async refreshSession(): Promise<boolean> {
    if (!this.currentUser) return false;
    // Re-query user to get updated data
    try {
      const users = await this.dataSource.query<any>(
        'SELECT id, name, email, role FROM users WHERE id = ? AND status = ?',
        [this.currentUser.id, 'active']
      );
      if (users.length === 0) {
        this.currentUser = null;
        return false;
      }
      this.currentUser = users[0];
      return true;
    } catch {
      return false;
    }
  }
}
