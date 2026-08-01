import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Student } from '../../../domain/aggregates/Student';
import { Enrollment } from '../../../domain/entities/Enrollment';
import { GuardianLink } from '../../../domain/entities/GuardianLink';
import {
  GuardianAssigned,
  GuardianRemoved,
  StudentActivated,
  StudentArchived,
  StudentEnrolled,
  StudentGraduated,
  StudentReactivated,
  StudentRegistered,
  StudentSuspended,
  StudentTransferred,
  StudentWithdrawn
} from '../../../domain/events';
import { BirthDate, EmailAddress, FullName, Gender, NationalId, PhoneNumber, StudentNumber } from '../../../domain/value-objects';

function registeredStudent(): Student {
  return Student.register({
    id: 'student-1',
    studentNumber: new StudentNumber('2027 0001'),
    fullName: new FullName({ firstName: 'Ali', lastName: 'Saleh' }),
    birthDate: new BirthDate('2012-01-01'),
    gender: new Gender('male'),
    nationalId: new NationalId('123456789'),
    phoneNumber: new PhoneNumber('0777123456', '967'),
    emailAddress: new EmailAddress('ALI@SCHOOL.EDU'),
    registeredBy: 'registrar-1',
    registeredAt: new Date('2026-08-01T00:00:00.000Z')
  });
}

function enrollment(studentId = 'student-1'): Enrollment {
  return new Enrollment({
    id: 'enrollment-1',
    studentId,
    academicYearId: 'year-2027',
    classId: 'class-1',
    sectionId: 'section-a',
    status: 'active'
  });
}

test('Student.register creates aggregate using value objects and raises event', () => {
  const student = registeredStudent();
  const events = student.pullDomainEvents();

  assert.equal(student.status, 'registered');
  assert.equal(student.version, 1);
  assert.equal(student.studentNumber.toString(), '2027-0001');
  assert.equal(student.emailAddress?.toString(), 'ali@school.edu');
  assert.equal(student.history.length, 1);
  assert.ok(events[0] instanceof StudentRegistered);
  assert.equal(student.pullDomainEvents().length, 0);
});

test('Student enrolls and activates after enrollment', () => {
  const student = registeredStudent();
  student.clearDomainEvents();

  student.enroll(enrollment(), 'registrar-1');
  student.activate('registrar-1');
  const events = student.pullDomainEvents();

  assert.equal(student.status, 'active');
  assert.equal(student.version, 3);
  assert.equal(student.enrollment?.id, 'enrollment-1');
  assert.equal(student.history.length, 3);
  assert.ok(events[0] instanceof StudentEnrolled);
  assert.ok(events[1] instanceof StudentActivated);
});

test('Student rejects activation before enrollment', () => {
  const student = registeredStudent();

  assert.throws(() => student.activate('registrar-1'), /before enrollment/);
});

test('Student rejects enrollment before admission through invalid rehydrated state', () => {
  const student = Student.rehydrate({
    id: 'student-2',
    studentNumber: new StudentNumber('2027-0002'),
    fullName: new FullName({ firstName: 'Mona', lastName: 'Ali' }),
    birthDate: new BirthDate('2011-01-01'),
    gender: new Gender('female'),
    status: 'archived',
    version: 3,
    lastModified: new Date('2026-08-01T00:00:00.000Z')
  });

  assert.throws(() => student.enroll(enrollment('student-2'), 'registrar-1'), /Archived student/);
});

test('Student suspends and reactivates active student', () => {
  const student = registeredStudent();
  student.enroll(enrollment(), 'registrar-1');
  student.activate('registrar-1');
  student.clearDomainEvents();

  student.suspend('disciplinary review', 'admin-1');
  student.reactivate('admin-1');
  const events = student.pullDomainEvents();

  assert.equal(student.status, 'active');
  assert.ok(events[0] instanceof StudentSuspended);
  assert.ok(events[1] instanceof StudentReactivated);
});

test('Student graduates once and rejects repeat graduation or transfer after graduation', () => {
  const student = registeredStudent();
  student.enroll(enrollment(), 'registrar-1');
  student.activate('registrar-1');
  student.clearDomainEvents();

  student.graduate('academic-admin-1');
  const events = student.pullDomainEvents();

  assert.equal(student.status, 'graduated');
  assert.ok(events[0] instanceof StudentGraduated);
  assert.throws(() => student.graduate('academic-admin-1'), /Graduated student/);
  assert.throws(() => student.transfer('transfer-1', 'admin-1'), /Graduated student/);
});

test('Student rejects archive while active and allows archive after withdrawal', () => {
  const student = registeredStudent();
  student.enroll(enrollment(), 'registrar-1');
  student.activate('registrar-1');
  student.clearDomainEvents();

  assert.throws(() => student.archive('cleanup', 'admin-1'), /Invalid student status transition/);
  student.withdraw('family request', 'admin-1');
  student.archive('retention closed', 'admin-1');
  const events = student.pullDomainEvents();

  assert.equal(student.status, 'archived');
  assert.ok(events[0] instanceof StudentWithdrawn);
  assert.ok(events[1] instanceof StudentArchived);
});

test('Student transfers active student and rejects mutation after transfer except archive', () => {
  const student = registeredStudent();
  student.enroll(enrollment(), 'registrar-1');
  student.activate('registrar-1');
  student.clearDomainEvents();

  student.transfer('transfer-1', 'admin-1');
  assert.equal(student.status, 'transferred');
  assert.ok(student.pullDomainEvents()[0] instanceof StudentTransferred);
  assert.throws(() => student.suspend('late records', 'admin-1'), /Transferred student/);

  student.archive('transferred out', 'admin-1');
  assert.equal(student.status, 'archived');
});

test('Student assigns guardians and protects primary guardian invariant', () => {
  const student = registeredStudent();
  student.clearDomainEvents();

  student.assignGuardian(
    new GuardianLink({
      id: 'link-1',
      studentId: 'student-1',
      guardianId: 'guardian-1',
      relationship: 'father',
      isPrimary: true
    }),
    'registrar-1'
  );

  assert.equal(student.guardians.length, 1);
  assert.ok(student.pullDomainEvents()[0] instanceof GuardianAssigned);
  assert.throws(
    () =>
      student.assignGuardian(
        new GuardianLink({
          id: 'link-2',
          studentId: 'student-1',
          guardianId: 'guardian-2',
          relationship: 'mother',
          isPrimary: true
        }),
        'registrar-1'
      ),
    /more than one primary guardian/
  );
});

test('Student removes guardian and rejects unknown guardian removal', () => {
  const student = registeredStudent();
  student.assignGuardian(
    new GuardianLink({
      id: 'link-1',
      studentId: 'student-1',
      guardianId: 'guardian-1',
      relationship: 'father',
      isPrimary: true
    }),
    'registrar-1'
  );
  student.clearDomainEvents();

  student.removeGuardian('guardian-1', 'registrar-1');

  assert.equal(student.guardians.length, 0);
  assert.throws(() => student.removeGuardian('guardian-1', 'registrar-1'), /not assigned/);
});

test('Student rejects guardian assignment and removal when changedBy is missing without mutation', () => {
  const student = registeredStudent();
  student.clearDomainEvents();
  const guardian = new GuardianLink({
    id: 'link-1',
    studentId: 'student-1',
    guardianId: 'guardian-1',
    relationship: 'father',
    isPrimary: true
  });

  assert.throws(() => student.assignGuardian(guardian, '   '), /Changed by is required/);
  assert.equal(student.guardians.length, 0);
  assert.equal(student.version, 1);
  assert.equal(student.pullDomainEvents().length, 0);

  student.assignGuardian(guardian, 'registrar-1');
  student.clearDomainEvents();

  assert.throws(() => student.removeGuardian('guardian-1', '   '), /Changed by is required/);
  assert.equal(student.guardians.length, 1);
  assert.equal(student.pullDomainEvents().length, 0);
});

test('Student rejects guardian mutation after archival', () => {
  const student = registeredStudent();
  const guardian = new GuardianLink({
    id: 'link-1',
    studentId: 'student-1',
    guardianId: 'guardian-1',
    relationship: 'father',
    isPrimary: true
  });
  student.assignGuardian(guardian, 'registrar-1');
  student.withdraw('family request', 'admin-1');
  student.archive('records closed', 'admin-1');
  student.clearDomainEvents();

  assert.throws(
    () =>
      student.assignGuardian(
        new GuardianLink({
          id: 'link-2',
          studentId: 'student-1',
          guardianId: 'guardian-2',
          relationship: 'mother',
          isPrimary: false
        }),
        'registrar-1'
      ),
    /Archived student/
  );
  assert.throws(() => student.removeGuardian('guardian-1', 'registrar-1'), /Archived student/);
  assert.equal(student.guardians.length, 1);
  assert.equal(student.pullDomainEvents().length, 0);
});
