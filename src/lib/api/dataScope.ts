import type { UserRole } from '../auth/contract';

export type DataScopeKind = 'school' | 'assigned' | 'own' | 'children' | 'unknown';

export type ScopeSubject =
  | 'all_school_records'
  | 'assigned_classes'
  | 'own_record_only'
  | 'linked_children_only'
  | 'undetermined';

export interface DataScopeExpectation {
  role: UserRole;
  expectedScope: DataScopeKind;
  scopeSubject: ScopeSubject;
  enforcement: 'server';
  clientSideFiltering: 'forbidden';
  requestParameter: null;
  evidence: string;
  openQuestions: string[];
}

export const DATA_SCOPE_EXPECTATIONS: readonly DataScopeExpectation[] = [
  {
    role: 'admin',
    expectedScope: 'school',
    scopeSubject: 'all_school_records',
    enforcement: 'server',
    clientSideFiltering: 'forbidden',
    requestParameter: null,
    evidence:
      'Sidebar admin-only destinations: classes, teachers, subjects, reports, settings, master-data, academic (src/components/Sidebar.tsx).',
    openQuestions: [
      'School scope filter shape for v1 single-school deployments (D3) is not defined by the backend contract.',
    ],
  },
  {
    role: 'teacher',
    expectedScope: 'assigned',
    scopeSubject: 'assigned_classes',
    enforcement: 'server',
    clientSideFiltering: 'forbidden',
    requestParameter: null,
    evidence:
      'Sidebar label "طلاب فصولي" (src/components/Sidebar.tsx) and TeacherDashboard educational views.',
    openQuestions: [
      'Canonical teacher assignment source (class / section / subject) is not fixed.',
      'Whether timetable and grade scope follow the same assignment is not fixed.',
    ],
  },
  {
    role: 'student',
    expectedScope: 'own',
    scopeSubject: 'own_record_only',
    enforcement: 'server',
    clientSideFiltering: 'forbidden',
    requestParameter: null,
    evidence:
      'Sidebar own-data labels: "جدولي الدراسي", "سجل الحضور", "درجاتي ونتائجي", "شهاداتي التقديرية" (src/components/Sidebar.tsx).',
    openQuestions: [
      'Canonical authenticated-user to student record relationship is not fixed.',
      'Resource list that is part of "own relevant data" (grades, attendance, certificates, schedule, documents, finance) is not fixed.',
    ],
  },
  {
    role: 'parent',
    expectedScope: 'children',
    scopeSubject: 'linked_children_only',
    enforcement: 'server',
    clientSideFiltering: 'forbidden',
    requestParameter: null,
    evidence:
      'Sidebar children labels: "متابعة الأبناء", "درجات الأبناء", "الأقساط والرسوم" (src/components/Sidebar.tsx).',
    openQuestions: [
      'Canonical guardian relationship (parent_students, user_linked_students, students.parent_id) is not fixed.',
      'Multi-guardian and primary-guardian semantics are not fixed.',
    ],
  },
];

const UNDETERMINED: DataScopeExpectation = {
  role: 'admin',
  expectedScope: 'unknown',
  scopeSubject: 'undetermined',
  enforcement: 'server',
  clientSideFiltering: 'forbidden',
  requestParameter: null,
  evidence: 'No evidence for this role in the Phase B evidence set.',
  openQuestions: ['Role is not part of the evidenced four-role set; backend mapping is not defined.'],
};

export function expectationForRole(role: UserRole | string): DataScopeExpectation {
  return DATA_SCOPE_EXPECTATIONS.find((entry) => entry.role === role) ?? UNDETERMINED;
}

export function isClientSideScopingPermitted(): boolean {
  return false;
}
