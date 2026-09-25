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
  email?: string;
  role?: string;
  token?: string;
  error?: string;
}

export interface UserCredentials {
  id: string;
  name: string;
  email: string;
  role: string;
  /**
   * Present only when the credential is resolved server-side for verification.
   * It must NEVER be returned to or persisted on the client (see PG-0 security
   * fix / D4). Made optional so the in-memory current user does not carry it.
   */
  passwordHash?: string;
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
