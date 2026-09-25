import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPABILITIES,
  CAPABILITY_PERMISSION_BINDING,
  CAPABILITY_PROFILES,
  canForSession,
  canLive,
  canMock,
  capabilitiesForRole,
  isCapabilityBound,
  rolesWithCapability,
  type Capability,
} from './capabilities';
import { USER_ROLES, type AuthSession } from './contract';

const ALL_ROLES = ['admin', 'teacher', 'student', 'parent'] as const;

const EXPECTED_PROFILES: Record<(typeof ALL_ROLES)[number], Capability[]> = {
  admin: [
    'ui:dashboard:read',
    'ui:master-data:read',
    'ui:academic:read',
    'ui:students:read',
    'ui:classes:read',
    'ui:teachers:read',
    'ui:subjects:read',
    'ui:timetable:read',
    'ui:calendar:read',
    'ui:attendance:read',
    'ui:grades:read',
    'ui:certificates:read',
    'ui:financial:read',
    'ui:library:read',
    'ui:documents:read',
    'ui:reports:read',
    'ui:ai-insights:read',
    'ui:notifications:read',
    'ui:settings:read',
  ],
  teacher: [
    'ui:dashboard:read',
    'ui:students:read',
    'ui:timetable:read',
    'ui:calendar:read',
    'ui:attendance:read',
    'ui:grades:read',
    'ui:library:read',
    'ui:documents:read',
    'ui:ai-insights:read',
    'ui:notifications:read',
  ],
  student: [
    'ui:dashboard:read',
    'ui:timetable:read',
    'ui:calendar:read',
    'ui:attendance:read',
    'ui:grades:read',
    'ui:certificates:read',
    'ui:library:read',
    'ui:documents:read',
    'ui:notifications:read',
  ],
  parent: [
    'ui:dashboard:read',
    'ui:students:read',
    'ui:timetable:read',
    'ui:calendar:read',
    'ui:attendance:read',
    'ui:grades:read',
    'ui:financial:read',
    'ui:library:read',
    'ui:documents:read',
    'ui:notifications:read',
  ],
};

function sessionFor(role: (typeof ALL_ROLES)[number], permissions: string[] = []): AuthSession {
  return {
    user: { id: `u-${role}`, name: role, email: `${role}@kayan.test`, role },
    permissions,
    token: null,
    mode: 'mock',
    authenticatedAt: new Date().toISOString(),
  };
}

test('the evidenced four roles are the only roles with a mock capability profile', () => {
  assert.deepEqual([...USER_ROLES], [...ALL_ROLES]);
  assert.deepEqual(Object.keys(CAPABILITY_PROFILES).sort(), [...ALL_ROLES].sort());
});

test('mock capability profiles mirror the verified phase A role visibility', () => {
  for (const role of ALL_ROLES) {
    assert.deepEqual([...CAPABILITY_PROFILES[role]].sort(), [...EXPECTED_PROFILES[role]].sort());
  }
});

test('every declared capability belongs to at least one role', () => {
  for (const value of Object.values(CAPABILITIES)) {
    assert.ok(rolesWithCapability(value).length > 0, `${value} has no role`);
  }
});

test('capability role lookup is the inverse of the mock profiles', () => {
  for (const [key, capability] of Object.entries(CAPABILITIES)) {
    for (const role of ALL_ROLES) {
      assert.equal(
        rolesWithCapability(capability).includes(role),
        CAPABILITY_PROFILES[role].includes(capability as Capability),
        `${key} mismatch for ${role}`,
      );
    }
  }
});

test('admin keeps management operations available in mock mode', () => {
  assert.equal(canMock('admin', CAPABILITIES.settingsRead), true);
  assert.equal(canMock('admin', CAPABILITIES.reportsRead), true);
  assert.equal(canMock('admin', CAPABILITIES.financialRead), true);
  assert.equal(canMock('admin', CAPABILITIES.studentsRead), true);
});

test('teacher keeps attendance, grades and educational views in mock mode', () => {
  assert.equal(canMock('teacher', CAPABILITIES.attendanceRead), true);
  assert.equal(canMock('teacher', CAPABILITIES.gradesRead), true);
  assert.equal(canMock('teacher', CAPABILITIES.studentsRead), true);
  assert.equal(canMock('teacher', CAPABILITIES.timetableRead), true);
  assert.equal(canMock('teacher', CAPABILITIES.financialRead), false);
  assert.equal(canMock('teacher', CAPABILITIES.settingsRead), false);
});

test('student keeps own data and view only in mock mode', () => {
  assert.equal(canMock('student', CAPABILITIES.gradesRead), true);
  assert.equal(canMock('student', CAPABILITIES.attendanceRead), true);
  assert.equal(canMock('student', CAPABILITIES.certificatesRead), true);
  assert.equal(canMock('student', CAPABILITIES.studentsRead), false);
  assert.equal(canMock('student', CAPABILITIES.financialRead), false);
});

test('parent keeps children data and view only in mock mode', () => {
  assert.equal(canMock('parent', CAPABILITIES.studentsRead), true);
  assert.equal(canMock('parent', CAPABILITIES.gradesRead), true);
  assert.equal(canMock('parent', CAPABILITIES.attendanceRead), true);
  assert.equal(canMock('parent', CAPABILITIES.financialRead), true);
  assert.equal(canMock('parent', CAPABILITIES.settingsRead), false);
  assert.equal(canMock('parent', CAPABILITIES.certificatesRead), false);
});

test('unknown roles and capabilities are denied by default', () => {
  assert.deepEqual(capabilitiesForRole('superadmin'), []);
  assert.equal(canMock('superadmin', CAPABILITIES.dashboardRead), false);
  assert.equal(canMock(null, CAPABILITIES.dashboardRead), false);
  assert.equal(canMock('admin', 'ui:unknown-resource:read'), false);
  assert.equal(canMock('admin', 'ui:students:delete'), false);
});

test('live mode stays deny by default until the permission binding is finalized', () => {
  assert.deepEqual(Object.keys(CAPABILITY_PERMISSION_BINDING), []);
  assert.equal(isCapabilityBound(CAPABILITIES.dashboardRead), false);
  assert.equal(canLive(['master_data:read'], CAPABILITIES.masterDataRead), false);
  assert.equal(canLive([], CAPABILITIES.masterDataRead), false);
  assert.equal(canLive(null, CAPABILITIES.masterDataRead), false);
});

test('canForSession resolves mock sessions from the role profile', () => {
  const teacher = sessionFor('teacher');
  assert.equal(canForSession(teacher, CAPABILITIES.attendanceRead), true);
  assert.equal(canForSession(teacher, CAPABILITIES.financialRead), false);
});

test('canForSession denies live sessions while the binding is empty', () => {
  const live: AuthSession = { ...sessionFor('admin'), mode: 'live', permissions: ['master_data:read'] };
  assert.equal(canForSession(live, CAPABILITIES.masterDataRead), false);
});

test('canForSession denies everything without a session', () => {
  assert.equal(canForSession(null, CAPABILITIES.dashboardRead), false);
});
