import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler, tokenStore } from '../api';
import { INTEGRATION_MODE, isMockMode, type IntegrationMode } from '../runtime/mode';
import { canForSession } from './capabilities';
import {
  describeAuthFailure,
  type AuthFailure,
  type AuthGateway,
  type AuthSession,
  type AuthUser,
  type LoginCredentials,
  type UserRole,
} from './contract';
import { mockAuthGateway, restoreMockSession, loginAsMockRole } from './mockAuthGateway';
import { fetchCurrentProfile, realAuthGateway } from './realAuthGateway';

export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  mode: IntegrationMode;
  user: AuthUser | null;
  session: AuthSession | null;
  permissions: readonly string[];
  isAuthenticated: boolean;
  failure: AuthFailure | null;
  login(credentials: LoginCredentials): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
  switchRole(role: UserRole): Promise<void>;
  can(capability: string): boolean;
}

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const gateway: AuthGateway = isMockMode() ? mockAuthGateway : realAuthGateway;

function initialState(): AuthState {
  if (isMockMode()) {
    const session = restoreMockSession();
    return { session, status: session ? 'authenticated' : 'anonymous' };
  }
  return { session: null, status: tokenStore.get() ? 'initializing' : 'anonymous' };
}

function liveSession(user: AuthUser, permissions: string[]): AuthSession {
  return {
    user,
    permissions,
    token: tokenStore.get(),
    mode: 'live',
    authenticatedAt: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const { session, status } = state;

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setState({ session: null, status: 'anonymous' });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (isMockMode()) return;
    let cancelled = false;

    if (!tokenStore.get()) {
      setState({ session: null, status: 'anonymous' });
      return;
    }

    fetchCurrentProfile()
      .then(({ user, permissions }) => {
        if (cancelled) return;
        setState({ session: liveSession(user, permissions), status: 'authenticated' });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ session: null, status: 'anonymous' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setFailure(null);
    try {
      const next = await gateway.login(credentials);
      setState({ session: next, status: 'authenticated' });
    } catch (error) {
      setFailure(describeAuthFailure(error));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const current = session;
    setState({ session: null, status: 'anonymous' });
    setFailure(null);
    await gateway.logout(current);
  }, [session]);

  const refreshSession = useCallback(async () => {
    if (isMockMode()) {
      const restored = restoreMockSession();
      setState({ session: restored, status: restored ? 'authenticated' : 'anonymous' });
      return;
    }

    if (!tokenStore.get()) {
      clearSession();
      return;
    }

    try {
      const { user, permissions } = await fetchCurrentProfile();
      setState({ session: liveSession(user, permissions), status: 'authenticated' });
    } catch {
      clearSession();
    }
  }, [clearSession]);

  const switchRole = useCallback(async (role: UserRole) => {
    if (!isMockMode()) return;
    const next = await loginAsMockRole(role);
    setFailure(null);
    setState({ session: next, status: 'authenticated' });
  }, []);

  const can = useCallback((capability: string) => canForSession(session, capability), [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      mode: INTEGRATION_MODE,
      user: session?.user ?? null,
      session,
      permissions: session?.permissions ?? [],
      isAuthenticated: status === 'authenticated' && session !== null,
      failure,
      login,
      logout,
      refreshSession,
      switchRole,
      can,
    }),
    [status, session, failure, login, logout, refreshSession, switchRole, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
