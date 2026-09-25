import { USER_ROLES, type AuthSession, type UserRole } from './contract';

export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

export type ResourceAction = `${string}:${PermissionAction}`;

export type Capability = `ui:${string}:${PermissionAction}`;

export const CAPABILITIES = {
  dashboardRead: 'ui:dashboard:read',
  masterDataRead: 'ui:master-data:read',
  academicRead: 'ui:academic:read',
  studentsRead: 'ui:students:read',
  classesRead: 'ui:classes:read',
  teachersRead: 'ui:teachers:read',
  subjectsRead: 'ui:subjects:read',
  timetableRead: 'ui:timetable:read',
  calendarRead: 'ui:calendar:read',
  attendanceRead: 'ui:attendance:read',
  gradesRead: 'ui:grades:read',
  certificatesRead: 'ui:certificates:read',
  financialRead: 'ui:financial:read',
  libraryRead: 'ui:library:read',
  documentsRead: 'ui:documents:read',
  reportsRead: 'ui:reports:read',
  aiInsightsRead: 'ui:ai-insights:read',
  notificationsRead: 'ui:notifications:read',
  settingsRead: 'ui:settings:read',
} as const satisfies Record<string, Capability>;

export type CapabilityKey = keyof typeof CAPABILITIES;

export const CAPABILITY_PROFILES: Readonly<Record<UserRole, readonly Capability[]>> = {
  admin: [
    CAPABILITIES.dashboardRead,
    CAPABILITIES.masterDataRead,
    CAPABILITIES.academicRead,
    CAPABILITIES.studentsRead,
    CAPABILITIES.classesRead,
    CAPABILITIES.teachersRead,
    CAPABILITIES.subjectsRead,
    CAPABILITIES.timetableRead,
    CAPABILITIES.calendarRead,
    CAPABILITIES.attendanceRead,
    CAPABILITIES.gradesRead,
    CAPABILITIES.certificatesRead,
    CAPABILITIES.financialRead,
    CAPABILITIES.libraryRead,
    CAPABILITIES.documentsRead,
    CAPABILITIES.reportsRead,
    CAPABILITIES.aiInsightsRead,
    CAPABILITIES.notificationsRead,
    CAPABILITIES.settingsRead,
  ],
  teacher: [
    CAPABILITIES.dashboardRead,
    CAPABILITIES.studentsRead,
    CAPABILITIES.timetableRead,
    CAPABILITIES.calendarRead,
    CAPABILITIES.attendanceRead,
    CAPABILITIES.gradesRead,
    CAPABILITIES.libraryRead,
    CAPABILITIES.documentsRead,
    CAPABILITIES.aiInsightsRead,
    CAPABILITIES.notificationsRead,
  ],
  student: [
    CAPABILITIES.dashboardRead,
    CAPABILITIES.timetableRead,
    CAPABILITIES.calendarRead,
    CAPABILITIES.attendanceRead,
    CAPABILITIES.gradesRead,
    CAPABILITIES.certificatesRead,
    CAPABILITIES.libraryRead,
    CAPABILITIES.documentsRead,
    CAPABILITIES.notificationsRead,
  ],
  parent: [
    CAPABILITIES.dashboardRead,
    CAPABILITIES.studentsRead,
    CAPABILITIES.timetableRead,
    CAPABILITIES.calendarRead,
    CAPABILITIES.attendanceRead,
    CAPABILITIES.gradesRead,
    CAPABILITIES.financialRead,
    CAPABILITIES.libraryRead,
    CAPABILITIES.documentsRead,
    CAPABILITIES.notificationsRead,
  ],
};

export const CAPABILITY_PERMISSION_BINDING: Readonly<Partial<Record<Capability, string>>> = {};

export function capabilitiesForRole(role: UserRole | string): readonly Capability[] {
  if (typeof role !== 'string') return [];
  const profile = CAPABILITY_PROFILES[role as UserRole];
  return profile ? profile : [];
}

export function rolesWithCapability(capability: string): UserRole[] {
  return USER_ROLES.filter((role) => capabilitiesForRole(role).includes(capability as Capability));
}

export function canMock(role: UserRole | string | null, capability: string): boolean {
  if (!role) return false;
  return capabilitiesForRole(role).includes(capability as Capability);
}

export function canLive(permissions: readonly string[] | null | undefined, capability: string): boolean {
  const bound = CAPABILITY_PERMISSION_BINDING[capability as Capability];
  if (!bound) return false;
  if (!Array.isArray(permissions)) return false;
  return permissions.includes(bound);
}

export function isCapabilityBound(capability: string): boolean {
  return Boolean(CAPABILITY_PERMISSION_BINDING[capability as Capability]);
}

export function canForSession(session: AuthSession | null, capability: string): boolean {
  if (!session) return false;
  if (session.mode === 'mock') return canMock(session.user.role, capability);
  return canLive(session.permissions, capability);
}
