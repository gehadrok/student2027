/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  userId?: string;
  name?: string;
  role?: string;
  token?: string;
  error?: string;
}

export interface UserCredentials {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
}

/**
 * Authentication provider interface.
 */
export interface IAuthProvider {
  login(request: LoginRequest): Promise<AuthResult>;
  logout(): void;
  getCurrentUser(): UserCredentials | null;
  isAuthenticated(): boolean;
  refreshSession(): Promise<boolean>;
}
