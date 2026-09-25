export { AuthProvider, useAuth } from './AuthContext';
export type { AuthContextValue, AuthStatus } from './AuthContext';
export {
  AuthGatewayError,
  USER_ROLES,
  describeAuthFailure,
  isUserRole,
  toAuthSession,
  toAuthUser,
  toMockAuthSession,
} from './contract';
export type {
  AuthFailure,
  AuthFailureReason,
  AuthGateway,
  AuthSession,
  AuthUser,
  LoginCredentials,
  UserRole,
} from './contract';
export {
  CAPABILITIES,
  CAPABILITY_PERMISSION_BINDING,
  CAPABILITY_PROFILES,
  canForSession,
  canLive,
  canMock,
  capabilitiesForRole,
  isCapabilityBound,
  rolesWithCapability,
} from './capabilities';
export type { Capability, CapabilityKey, PermissionAction, ResourceAction } from './capabilities';
export { MOCK_DEMO_PASSWORD, mockAuthGateway, loginAsMockRole, restoreMockSession } from './mockAuthGateway';
export { fetchCurrentProfile, realAuthGateway, refreshLiveToken } from './realAuthGateway';
export type { KayanLoginResponse, KayanProfileResponse } from './realAuthGateway';
