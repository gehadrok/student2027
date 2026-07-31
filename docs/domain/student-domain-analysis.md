# Student Domain Analysis — Domain-Driven Design (DDD)

**Date:** 2026-08-01  
**Scope:** Phase 2 — Student Domain Foundation  
**Project:** Al-Salam School Management System (مدرسة خالد ابن الوليد الضالع/جحاف)  
**Methodology:** Domain-Driven Design (DDD) — Tactical Patterns  
**Status:** Analysis Only — No Implementation

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Domain Overview](#2-domain-overview)
3. [Ubiquitous Language](#3-ubiquitous-language)
4. [Entities](#4-entities)
5. [Value Objects](#5-value-objects)
6. [Domain Events](#6-domain-events)
7. [Business Policies](#7-business-policies)
8. [Domain Services](#8-domain-services)
9. [Aggregates](#9-aggregates)
10. [Dependency Diagram](#10-dependency-diagram)
11. [State Machine — Student Lifecycle](#11-state-machine--student-lifecycle)
12. [Repository Interfaces](#12-repository-interfaces)
13. [Domain Report](#13-domain-report)
14. [Future Extensions](#14-future-extensions)

---

## 1. Current State Analysis

### 1.1 Existing Student Module Structure

```
src/modules/students/
├── types/
│   └── index.ts              → StudentEntity interface (flat, anemic model)
├── repository/
│   └── studentRepository.ts  → StudentRepository implements IStudentRepository
├── services/
│   └── studentService.ts     → StudentService (CRUD + filtering)
└── hooks/
    └── useStudents.ts        → React hook consuming service
```

### 1.2 Current StudentEntity Interface

```typescript
export interface StudentEntity {
  id: string;
  name: string;
  nationalId: string;
  classId: string;
  className?: string;
  guardianName: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'male' | 'female';
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred' | 'at-risk';
  healthNotes?: string;
  photo?: string;
  rfidCardId?: string;
}
```

### 1.3 Current Database Schema (students table)

```sql
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    academic_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
    photo TEXT,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK(status IN ('active', 'transferred', 'graduated', 'at-risk')),
    health_notes TEXT,
    enrollment_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (parent_id) REFERENCES parents(id)
);
```

### 1.4 Current Status Discrepancy

| Source | Status Values |
|--------|---------------|
| `StudentEntity` (TypeScript) | `active`, `inactive`, `suspended`, `transferred`, `at-risk` |
| Schema (SQLite) | `active`, `transferred`, `graduated`, `at-risk` |

**Issue:** The TypeScript interface and SQL CHECK constraint are out of sync. A DDD-aligned domain model must define the authoritative lifecycle.

### 1.5 Current Repository Interface

```typescript
export interface IStudentRepository {
  getAll(): Student[];
  getById(id: string): Student | undefined;
  getByClass(classId: string): Student[];
  save(student: Student): Student;
  delete(id: string): boolean;
}
```

### 1.6 Current Gaps Identified

| Gap | Description |
|-----|-------------|
| **Anemic Domain Model** | `StudentEntity` is a data bag with no behavior (no methods, no invariants) |
| **No Value Objects** | `nationalId`, `phone`, `address`, `birthDate` are raw strings |
| **No Domain Events** | Admission, transfer, graduation, etc. produce no events |
| **No Business Policies** | Age validation, promotion rules, transfer policies are absent |
| **No Aggregate Boundaries** | Guardians, documents, medical records are not modeled as a cohesive aggregate |
| **No State Machine** | Student lifecycle transitions are not enforced |
| **No Domain Services** | Admission, promotion, graduation logic is mixed into CRUD service |
| **Status Inconsistency** | TypeScript and SQL schema statuses diverge |

---

## 2. Domain Overview

### 2.1 Domain Statement

The **Student Domain** is the core of the school management system. It manages the complete lifecycle of a student from initial application/admission through enrollment, academic progression, transfers, graduation, and eventual archival. The domain encompasses the student's personal information, academic records, guardianship, medical data, attendance, discipline, and documentation.

### 2.2 Bounded Context

```
┌─────────────────────────────────────────────────────┐
│                 STUDENT BOUNDED CONTEXT              │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Admission   │  │  Enrollment  │  │  Academic  │  │
│  │  Context     │  │  Context     │  │  Context   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                 │         │
│         └─────────────────┼─────────────────┘         │
│                           ▼                           │
│              ┌────────────────────────┐               │
│              │   STUDENT AGGREGATE    │               │
│              │   (Root: Student)      │               │
│              └────────────────────────┘               │
│                           │                            │
│         ┌─────────────────┼─────────────────┐         │
│         ▼                 ▼                 ▼         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │  Guardian  │  │  Medical     │  │  Documents │   │
│  │  Context   │  │  Context     │  │  Context   │   │
│  └────────────┘  └──────────────┘  └────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2.3 Relationship to Other Bounded Contexts

| Bounded Context | Relationship | Type |
|----------------|-------------|------|
| **Master Data** | Provides class, section, grade level, nationality, etc. | Reference |
| **Financial** | Manages fee payments linked to student | Independent |
| **Attendance** | Records attendance per student per day | Independent |
| **Grading** | Manages academic scores and certificates | Independent |
| **Library** | Manages book borrowings by student | Independent |
| **User/Auth** | Provides user identity linked to student | Supporting |

---

## 3. Ubiquitous Language

### 3.1 Core Terms (Arabic / English)

| Arabic Term | English Term | Definition |
|-------------|-------------|------------|
| طالب | Student | A person enrolled in the school's educational program |
| ولي أمر | Guardian | A parent or legal guardian responsible for the student |
| تسجيل | Enrollment | The process of registering a student in a class/section |
| قبول | Admission | The process of accepting a student applicant into the school |
| نقل | Transfer | Moving a student from one class/section/school to another |
| تخرج | Graduation | The completion of all academic requirements |
| ترقية | Promotion | Advancing a student to the next grade level |
| ملف طالب | Student Record | The complete collection of student data |
| سجل أكاديمي | Academic Record | The student's grades, certificates, and academic history |
| حالة طالب | Student Status | The current stage in the student lifecycle |
| رقم أكاديمي | Academic ID | Unique identifier assigned to each student |
| رقم وطني | National ID | Government-issued identification number |
| بطاقة RFID | RFID Card | Electronic card for student identification and tracking |

### 3.2 Status Values

| Status | Description |
|--------|-------------|
| `Applicant` | Prospective student who has applied but not yet admitted |
| `Accepted` | Application approved, awaiting enrollment |
| `Enrolled` | Registered in a class/section, academic year started |
| `Active` | Currently attending classes, status normal |
| `AtRisk` | Academic performance below threshold, intervention needed |
| `Suspended` | Temporarily removed from classes due to disciplinary action |
| `Transferred` | Moved to another class/section/school |
| `Graduated` | Completed all requirements for the current academic level |
| `Archived` | No longer active (graduated final level, withdrawn, or deceased) |

---

## 4. Entities

### 4.1 Entity: Student (Aggregate Root)

**Identity:** `studentId` (UUID) + `academicId` (school-assigned unique code)

**Attributes:**

```typescript
interface Student {
  // Identity
  id: StudentId;                    // Value Object — UUID
  academicId: AcademicId;           // Value Object — e.g., "2026-0001"
  userId: UserId;                   // Reference to User entity

  // Personal Information
  fullName: FullName;               // Value Object
  nationalId: NationalId;           // Value Object
  birthDate: BirthDate;             // Value Object
  gender: Gender;                   // Value Object
  photo: Photo;                     // Value Object (optional)

  // Contact
  phone: PhoneNumber;               // Value Object
  email: Email;                     // Value Object (optional)
  address: Address;                 // Value Object

  // Academic Placement
  classId: ClassId;                 // Reference to Master Data
  sectionId: SectionId;             // Reference to Master Data
  enrollmentDate: EnrollmentDate;   // Value Object

  // Status
  status: StudentStatus;            // Value Object (enum-like)

  // Medical
  healthNotes: HealthNotes;         // Value Object (optional)

  // Tracking
  rfidCardId: RfidCardId;           // Value Object (optional)
  createdAt: Timestamp;             // Value Object
  updatedAt: Timestamp;             // Value Object

  // Behavior
  enroll(classId, sectionId): void;
  transfer(newClassId, newSectionId): void;
  graduate(): void;
  suspend(reason: string): void;
  reactivate(): void;
  archive(): void;
  updatePersonalInfo(info: PersonalInfo): void;
  assignGuardian(guardian: Guardian): void;
  addMedicalRecord(record: MedicalRecord): void;
  addDocument(document: StudentDocument): void;
}
```

### 4.2 Entity: Guardian

**Identity:** `guardianId` (UUID)

**Attributes:**

```typescript
interface Guardian {
  id: GuardianId;
  fullName: FullName;
  relationship: GuardianRelationship;  // Value Object: father, mother, brother, etc.
  phone: PhoneNumber;
  email: Email;
  nationalId: NationalId;
  occupation: string;
  isPrimary: boolean;
  address: Address;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.3 Entity: Enrollment

**Identity:** `enrollmentId` (UUID)

**Attributes:**

```typescript
interface Enrollment {
  id: EnrollmentId;
  studentId: StudentId;
  academicYearId: AcademicYearId;
  termId: AcademicTermId;
  classId: ClassId;
  sectionId: SectionId;
  enrollmentDate: EnrollmentDate;
  enrollmentType: EnrollmentType;     // Value Object: new, transfer, re-enrollment
  status: EnrollmentStatus;           // Value Object: active, completed, withdrawn
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.4 Entity: AcademicRecord

**Identity:** `academicRecordId` (UUID)

**Attributes:**

```typescript
interface AcademicRecord {
  id: AcademicRecordId;
  studentId: StudentId;
  academicYearId: AcademicYearId;
  termId: AcademicTermId;
  gpa: Gpa;                          // Value Object
  percentage: Percentage;             // Value Object
  gradeLabel: GradeLabel;             // Value Object: ممتاز, جيد جداً, جيد, مقبول
  rankInClass: Rank;                  // Value Object
  subjects: SubjectResult[];          // Collection of subject results
  isPassed: boolean;
  promoted: boolean;
  certificateId?: CertificateId;      // Reference to Certificate entity
  createdAt: Timestamp;
}
```

### 4.5 Entity: StudentDocument

**Identity:** `documentId` (UUID)

**Attributes:**

```typescript
interface StudentDocument {
  id: DocumentId;
  studentId: StudentId;
  documentType: DocumentType;         // Value Object: birthCertificate, nationalId, photo, etc.
  fileName: string;
  fileUrl: string;
  mimeType: string;
  uploadedAt: Timestamp;
  verifiedAt?: Timestamp;
  verifiedBy?: UserId;
  expiresAt?: Date;
  isVerified: boolean;
}
```

### 4.6 Entity: MedicalRecord

**Identity:** `medicalRecordId` (UUID)

**Attributes:**

```typescript
interface MedicalRecord {
  id: MedicalRecordId;
  studentId: StudentId;
  bloodType: BloodType;              // Value Object: A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  emergencyContact: EmergencyContact; // Value Object
  insuranceProvider: string;
  insuranceNumber: string;
  lastCheckupDate: Date;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.7 Entity: StudentPhoto

**Identity:** `photoId` (UUID)

**Attributes:**

```typescript
interface StudentPhoto {
  id: PhotoId;
  studentId: StudentId;
  url: string;
  thumbnailUrl: string;
  uploadedAt: Timestamp;
  isCurrent: boolean;
  uploadedBy: UserId;
}
```

### 4.8 Entity: EmergencyContact

**Identity:** `emergencyContactId` (UUID)

**Attributes:**

```typescript
interface EmergencyContact {
  id: EmergencyContactId;
  studentId: StudentId;
  fullName: FullName;
  relationship: string;
  phone: PhoneNumber;
  phone2?: PhoneNumber;
  email?: Email;
  address?: Address;
  priority: number;  // 1 = primary, 2 = secondary, etc.
}
```

### 4.9 Entity: StudentNote

**Identity:** `noteId` (UUID)

**Attributes:**

```typescript
interface StudentNote {
  id: NoteId;
  studentId: StudentId;
  category: NoteCategory;            // Value Object: academic, behavioral, general, medical
  content: string;
  createdBy: UserId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isConfidential: boolean;
  isFlagged: boolean;
}
```

### 4.10 Entity: StudentTransfer

**Identity:** `transferId` (UUID)

**Attributes:**

```typescript
interface StudentTransfer {
  id: TransferId;
  studentId: StudentId;
  transferType: TransferType;        // Value Object: internal, external
  fromClassId: ClassId;
  fromSectionId: SectionId;
  toClassId: ClassId;
  toSectionId: SectionId;
  reason: string;
  transferDate: Date;
  approvedBy: UserId;
  status: TransferStatus;            // Value Object: pending, approved, completed, rejected
  notes: string;
  createdAt: Timestamp;
}
```

### 4.11 Entity: StudentPromotion

**Identity:** `promotionId` (UUID)

**Attributes:**

```typescript
interface StudentPromotion {
  id: PromotionId;
  studentId: StudentId;
  fromGradeLevel: GradeLevel;
  toGradeLevel: GradeLevel;
  academicYearId: AcademicYearId;
  promotionDate: Date;
  approvedBy: UserId;
  status: PromotionStatus;           // Value Object: pending, approved, completed
  isAutomatic: boolean;
  notes: string;
  createdAt: Timestamp;
}
```

### 4.12 Entity: StudentGraduation

**Identity:** `graduationId` (UUID)

**Attributes:**

```typescript
interface StudentGraduation {
  id: GraduationId;
  studentId: StudentId;
  graduatedGradeLevel: GradeLevel;
  academicYearId: AcademicYearId;
  graduationDate: Date;
  certificateNumber: string;
  gpa: Gpa;
  percentage: Percentage;
  rank: Rank;
  approvedBy: UserId;
  status: GraduationStatus;          // Value Object: pending, approved, completed
  ceremonyDate?: Date;
  notes: string;
  createdAt: Timestamp;
}
```

### 4.13 Entity: StudentDiscipline

**Identity:** `disciplineId` (UUID)

**Attributes:**

```typescript
interface StudentDiscipline {
  id: DisciplineId;
  studentId: StudentId;
  incidentDate: Date;
  incidentType: IncidentType;        // Value Object
  description: string;
  action: DisciplinaryAction;        // Value Object
  actionDate: Date;
  issuedBy: UserId;
  duration?: number;                  // Days of suspension
  status: DisciplineStatus;          // Value Object: open, resolved, appealed
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.14 Entity: StudentAttendanceSummary

**Identity:** `attendanceSummaryId` (UUID)

**Attributes:**

```typescript
interface StudentAttendanceSummary {
  id: AttendanceSummaryId;
  studentId: StudentId;
  academicYearId: AcademicYearId;
  termId: AcademicTermId;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  attendancePercentage: Percentage;
  lastUpdated: Timestamp;
}
```

### 4.15 Entity: StudentStatus

**Identity:** `studentStatusId` (UUID)

**Attributes:**

```typescript
interface StudentStatusHistory {
  id: StudentStatusId;
  studentId: StudentId;
  previousStatus: StudentStatus;
  newStatus: StudentStatus;
  changedBy: UserId;
  changedAt: Timestamp;
  reason: string;
  referenceId?: string;              // Reference to related entity (transfer, discipline, etc.)
}
```

---

## 5. Value Objects

### 5.1 Value Objects Defined

| Value Object | Type | Properties | Validation Rules |
|-------------|------|------------|-----------------|
| `StudentId` | Immutable | `value: string` (UUID) | Must be valid UUID v4 |
| `AcademicId` | Immutable | `value: string` | Format: `YYYY-NNNN`, unique |
| `UserId` | Immutable | `value: string` | Must be valid UUID |
| `FullName` | Immutable | `firstName, middleName?, lastName, suffix?` | Non-empty, max 100 chars |
| `NationalId` | Immutable | `value: string` | 6-20 digits, country-specific |
| `BirthDate` | Immutable | `value: Date` | Must be < 25 years from now |
| `Gender` | Enum | `male \| female` | Must be one of two values |
| `PhoneNumber` | Immutable | `value: string` | 7-20 chars, + prefix optional |
| `Email` | Immutable | `value: string` | Valid email format |
| `Address` | Immutable | `street, city, governorate, country, postalCode?` | Non-empty street/city |
| `ClassId` | Immutable | `value: string` | Must reference existing class |
| `SectionId` | Immutable | `value: string` | Must reference existing section |
| `EnrollmentDate` | Immutable | `value: Date` | Must not be in the future |
| `StudentStatus` | Enum | `applicant \| accepted \| enrolled \| active \| at-risk \| suspended \| transferred \| graduated \| archived` | Controlled transitions |
| `HealthNotes` | Immutable | `value: string` | Max 500 chars |
| `RfidCardId` | Immutable | `value: string` | Unique per card |
| `Timestamp` | Immutable | `value: Date` | ISO 8601 format |
| `BloodType` | Enum | `A+ \| A- \| B+ \| B- \| AB+ \| AB- \| O+ \| O-` | Must be valid |
| `GuardianRelationship` | Enum | `father \| mother \| brother \| sister \| grandfather \| grandmother \| uncle \| aunt \| other` | Must be valid |
| `EnrollmentType` | Enum | `new \| transfer \| re-enrollment` | Must be valid |
| `EnrollmentStatus` | Enum | `active \| completed \| withdrawn` | Must be valid |
| `Gpa` | Immutable | `value: number` | 0.0 - 4.0 |
| `Percentage` | Immutable | `value: number` | 0 - 100 |
| `GradeLabel` | Enum | `ممتاز \| جيد جداً \| جيد \| مقبول \| ضعيف` | Must be valid |
| `Rank` | Immutable | `value: number` | 1 - N |
| `DocumentType` | Enum | `birthCertificate \| nationalId \| photo \| transcript \| medicalReport \| transferLetter \| other` | Must be valid |
| `TransferType` | Enum | `internal \| external` | Must be valid |
| `TransferStatus` | Enum | `pending \| approved \| completed \| rejected` | Must be valid |
| `PromotionStatus` | Enum | `pending \| approved \| completed` | Must be valid |
| `GraduationStatus` | Enum | `pending \| approved \| completed` | Must be valid |
| `IncidentType` | Enum | `bullying \| fighting \| cheating \| vandalism \| disrespect \| absence \| other` | Must be valid |
| `DisciplinaryAction` | Enum | `warning \| detention \| suspension \| expulsion \| counseling \| other` | Must be valid |
| `DisciplineStatus` | Enum | `open \| resolved \| appealed` | Must be valid |
| `NoteCategory` | Enum | `academic \| behavioral \| general \| medical` | Must be valid |

### 5.2 Value Object Example (Full Implementation)

```typescript
// Value Object Pattern
class FullName {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly middleName?: string,
    public readonly suffix?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.firstName || this.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }
    if (!this.lastName || this.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }
    if (this.firstName.length > 50) {
      throw new ValidationError('First name must not exceed 50 characters');
    }
    if (this.lastName.length > 50) {
      throw new ValidationError('Last name must not exceed 50 characters');
    }
  }

  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName]
      .filter(Boolean)
      .join(' ');
  }

  equals(other: FullName): boolean {
    return this.fullName === other.fullName;
  }
}
```

---

## 6. Domain Events

### 6.1 Event Definitions

| Event Name | Payload | Trigger | Subscribers |
|-----------|---------|---------|-------------|
| `StudentAdmitted` | `{ studentId, academicId, admittedBy, admittedAt }` | Admission complete | Notification, Audit, User |
| `StudentRegistered` | `{ studentId, classId, sectionId, enrollmentDate }` | Initial enrollment | Notification, Academic, Financial |
| `StudentEnrolled` | `{ studentId, academicYearId, termId, classId, sectionId }` | Enrollment created | Attendance, Financial, Library |
| `StudentTransferred` | `{ studentId, fromClass, toClass, fromSection, toSection, transferDate }` | Transfer approved | Academic, Attendance, Notification |
| `StudentGraduated` | `{ studentId, gradeLevel, gpa, percentage, graduationDate }` | Graduation approved | Academic, Notification, Alumni |
| `StudentPromoted` | `{ studentId, fromGrade, toGrade, academicYearId }` | Promotion approved | Academic, Enrollment |
| `GuardianAssigned` | `{ studentId, guardianId, relationship }` | Guardian linked | Notification |
| `GuardianRemoved` | `{ studentId, guardianId }` | Guardian unlinked | Notification |
| `StudentSuspended` | `{ studentId, reason, duration, suspendedBy }` | Disciplinary action | Notification, Attendance |
| `StudentReactivated` | `{ studentId, reactivatedBy, reactivatedAt }` | Suspension ended | Notification, Attendance |
| `StudentAtRiskIdentified` | `{ studentId, gpa, threshold, identifiedAt }` | Academic drop | Academic, Notification |
| `StudentArchived` | `{ studentId, reason, archivedBy, archivedAt }` | Lifecycle end | All subscribers |
| `StudentStatusChanged` | `{ studentId, previousStatus, newStatus, changedBy, reason }` | Any status change | Audit, Notification |
| `StudentPhotoUpdated` | `{ studentId, photoUrl }` | Photo change | Profile |
| `StudentDocumentUploaded` | `{ studentId, documentType, documentId }` | Document added | Document |
| `StudentMedicalRecordUpdated` | `{ studentId, updatedBy }` | Medical change | Health, Emergency |
| `StudentPersonalInfoUpdated` | `{ studentId, changedFields[] }` | Info change | Audit |

### 6.2 Event Schema

```typescript
interface DomainEvent {
  eventId: string;           // UUID
  eventName: string;         // PascalCase, e.g., "StudentAdmitted"
  eventVersion: number;      // For schema evolution
  occurredAt: Date;          // When the event happened
  correlationId?: string;    // For event tracing
  causationId?: string;      // Which event caused this one
}

interface StudentAdmittedEvent extends DomainEvent {
  eventName: 'StudentAdmitted';
  payload: {
    studentId: string;
    academicId: string;
    admittedBy: string;
    admittedAt: Date;
    applicantId: string;
  };
}
```

---

## 7. Business Policies

### 7.1 Admission Policy

**Policy Name:** `AdmissionPolicy`

**Rules:**
1. Applicant must be between 5 and 25 years of age (based on `BirthDate`)
2. Applicant must have a valid `NationalId`
3. Applicant must have a designated `Guardian`
4. Applicant must have submitted all required documents (defined by `DocumentType`)
5. Target class/section must have available capacity
6. Academic year must be currently open for admissions
7. No duplicate admission for the same `NationalId` in the same academic year

**Specification:**

```typescript
class AdmissionPolicy {
  isSatisfiedBy(applicant: StudentApplicant): boolean {
    return this.isAgeValid(applicant.birthDate)
      && this.hasValidNationalId(applicant.nationalId)
      && this.hasGuardian(applicant.guardianId)
      && this.hasRequiredDocuments(applicant.documents)
      && this.hasCapacity(applicant.classId, applicant.sectionId)
      && this.isAdmissionOpen(applicant.academicYearId)
      && !this.isDuplicateNationalId(applicant.nationalId);
  }
}
```

### 7.2 Promotion Policy

**Policy Name:** `PromotionPolicy`

**Rules:**
1. Student must have a passing GPA (>= 50% or equivalent)
2. Student must have attended >= 75% of classes
3. Student must have no outstanding disciplinary actions
4. Student must have completed all required subjects
5. Promotion is automatic for grades 1-8; requires approval for grades 9-12
6. Student can only be promoted once per academic year

### 7.3 Transfer Policy

**Policy Name:** `TransferPolicy`

**Rules:**
1. Internal transfer: Target section must have capacity
2. External transfer: Requires transfer document from previous school
3. Student must have no outstanding financial obligations
4. Transfer is not allowed during exam periods
5. Transfer must be approved by academic administration
6. Student academic records must be transferred alongside

### 7.4 Graduation Policy

**Policy Name:** `GraduationPolicy`

**Rules:**
1. Student must have completed all grade levels in the education stage
2. Student must have a cumulative GPA >= 50%
3. Student must have no outstanding financial obligations
4. Student must have completed all required community service hours (if applicable)
5. Student must have passed all required subjects
6. Graduation must be approved by the examination committee

### 7.5 Age Validation Policy

**Policy Name:** `AgeValidationPolicy`

**Rules:**
1. Minimum age for enrollment: 5 years (Grade 1)
2. Maximum age for enrollment: 25 years (any grade)
3. Age is calculated from `BirthDate` relative to the academic year start date
4. Age exceptions require administrative approval

### 7.6 Enrollment Policy

**Policy Name:** `EnrollmentPolicy`

**Rules:**
1. Student can only be enrolled in one active class/section per academic year
2. Enrollment requires a completed admission process
3. Class/section capacity must not be exceeded
4. Enrollment is only valid for the current academic year
5. Re-enrollment is required for returning students after a break

### 7.7 Suspension Policy

**Policy Name:** `SuspensionPolicy`

**Rules:**
1. Suspension requires a documented disciplinary incident
2. Maximum suspension duration is 30 days
3. Suspension must be approved by the discipline committee
4. Student cannot attend classes during suspension
5. Suspension cannot exceed 2 times per academic year
6. Automatic review after 15 days of suspension

### 7.8 At-Risk Policy

**Policy Name:** `AtRiskPolicy`

**Rules:**
1. Student is flagged "at-risk" if GPA drops below 60%
2. Student is flagged "at-risk" if attendance drops below 70%
3. At-risk flag triggers automatic notification to guardian
4. At-risk student must receive academic intervention within 7 days
5. At-risk status is reviewed every 30 days

---

## 8. Domain Services

### 8.1 Service Definitions

| Service | Responsibility | Methods |
|---------|---------------|---------|
| `AdmissionService` | Processes student applications and admissions | `admit(applicant): Student`, `reject(applicantId, reason): void`, `getApplicationStatus(applicantId): ApplicationStatus` |
| `EnrollmentService` | Manages enrollment in classes/sections | `enroll(student, classId, sectionId): Enrollment`, `withdraw(enrollmentId): void`, `reEnroll(student, classId, sectionId): Enrollment` |
| `PromotionService` | Handles grade promotion decisions | `promote(student): Promotion`, `batchPromote(students[]): Promotion[]`, `getPromotionEligibility(student): EligibilityResult` |
| `GraduationService` | Manages graduation process | `graduate(student): Graduation`, `batchGraduate(students[]): Graduation[]`, `getGraduationEligibility(student): EligibilityResult` |
| `TransferService` | Handles internal/external transfers | `initiateTransfer(student, toClass, toSection): Transfer`, `approveTransfer(transferId): void`, `rejectTransfer(transferId, reason): void`, `completeTransfer(transferId): void` |
| `GuardianAssignmentService` | Manages guardian relationships | `assignGuardian(student, guardian, relationship): void`, `removeGuardian(student, guardian): void`, `getGuardians(student): Guardian[]` |
| `StudentStatusService` | Manages lifecycle state transitions | `changeStatus(student, newStatus, reason): void`, `getStatusHistory(student): StatusChange[]`, `canTransition(currentStatus, newStatus): boolean` |
| `DisciplineService` | Manages disciplinary processes | `reportIncident(student, incident): Discipline`, `resolveIncident(disciplineId): void`, `appealDiscipline(disciplineId, reason): void` |
| `DocumentService` | Manages student documents | `uploadDocument(student, document): Document`, `verifyDocument(documentId): void`, `getDocuments(student): Document[]` |
| `MedicalService` | Manages medical records | `updateMedicalRecord(student, record): MedicalRecord`, `getMedicalRecord(student): MedicalRecord` |
| `StudentSearchService` | Advanced search across student domain | `search(criteria): Student[]`, `getByStatus(status): Student[]`, `getByGradeLevel(gradeLevel): Student[]` |

### 8.2 Domain Service Example

```typescript
class AdmissionService {
  constructor(
    private studentRepository: IStudentDomainRepository,
    private eventBus: IEventBus,
    private admissionPolicy: AdmissionPolicy,
    private ageValidationPolicy: AgeValidationPolicy
  ) {}

  admit(applicant: StudentApplicant): Student {
    // 1. Validate policies
    if (!this.admissionPolicy.isSatisfiedBy(applicant)) {
      throw new BusinessError('Admission policy not satisfied');
    }
    if (!this.ageValidationPolicy.isSatisfiedBy(applicant.birthDate)) {
      throw new BusinessError('Age validation failed');
    }

    // 2. Create student aggregate
    const student = Student.create(
      new StudentId(uuid()),
      new AcademicId(generateAcademicId()),
      applicant.fullName,
      applicant.nationalId,
      applicant.birthDate,
      applicant.gender,
      applicant.classId,
      applicant.sectionId
    );

    // 3. Set initial status
    student.changeStatus(StudentStatus.ACCEPTED);

    // 4. Persist
    this.studentRepository.save(student);

    // 5. Publish event
    this.eventBus.publish('StudentAdmitted', {
      studentId: student.id.value,
      academicId: student.academicId.value,
      admittedBy: applicant.processedBy,
      admittedAt: new Date(),
    });

    return student;
  }
}
```

---

## 9. Aggregates

### 9.1 Student Aggregate

**Aggregate Root:** `Student`

**Consistency Boundary:** All changes to the Student's personal data, status, and core attributes must go through the `Student` aggregate root.

**Children (Entities within the Aggregate):**

| Child Entity | Type | Relation | Notes |
|-------------|------|----------|-------|
| `Guardian` | Entity (owned) | 1..* | Managed through aggregate root |
| `StudentDocument` | Entity (owned) | 0..* | Managed through aggregate root |
| `MedicalRecord` | Entity (owned) | 0..1 | Managed through aggregate root |
| `StudentPhoto` | Entity (owned) | 1..* | Managed through aggregate root |
| `EmergencyContact` | Entity (owned) | 0..* | Managed through aggregate root |
| `StudentNote` | Entity (owned) | 0..* | Managed through aggregate root |
| `StudentStatusHistory` | Entity (owned) | 0..* | Managed through aggregate root |

**References to Other Aggregates (by ID only):**

| Reference | Type | Notes |
|-----------|------|-------|
| `classId` | Reference | Points to Class aggregate (Master Data) |
| `sectionId` | Reference | Points to Section aggregate (Master Data) |
| `userId` | Reference | Points to User aggregate (Auth) |

**Entities Outside the Aggregate (Separate Aggregates):**

| Entity | Aggregate Root | Reason |
|--------|---------------|--------|
| `Enrollment` | Enrollment | Separate lifecycle, independent transactions |
| `AcademicRecord` | AcademicRecord | Separate consistency boundary |
| `StudentTransfer` | StudentTransfer | Process-oriented, spans multiple aggregates |
| `StudentPromotion` | StudentPromotion | Process-oriented, spans multiple aggregates |
| `StudentGraduation` | StudentGraduation | Process-oriented, spans multiple aggregates |
| `StudentDiscipline` | StudentDiscipline | Separate consistency boundary |
| `StudentAttendanceSummary` | AttendanceSummary | Updated by Attendance context |

### 9.2 Aggregate Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT AGGREGATE                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Student (Root)                         │   │
│  │  - id: StudentId                                         │   │
│  │  - academicId: AcademicId                                │   │
│  │  - fullName: FullName                                    │   │
│  │  - nationalId: NationalId                                │   │
│  │  - birthDate: BirthDate                                  │   │
│  │  - gender: Gender                                        │   │
│  │  - email: Email                                          │   │
│  │  - phone: PhoneNumber                                    │   │
│  │  - address: Address                                      │   │
│  │  - status: StudentStatus                                 │   │
│  │  - classId: ClassId (ref)                                │   │
│  │  - sectionId: SectionId (ref)                            │   │
│  │  - userId: UserId (ref)                                  │   │
│  │  - enrollmentDate: EnrollmentDate                        │   │
│  │  - healthNotes: HealthNotes                              │   │
│  │  - rfidCardId: RfidCardId                                │   │
│  │  - photo: Photo                                          │   │
│  │  - createdAt: Timestamp                                  │   │
│  │  - updatedAt: Timestamp                                  │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐               │
│         ▼                    ▼                    ▼               │
│  ┌──────────┐  ┌────────────────┐  ┌──────────────────────┐      │
│  │ Guardian │  │ MedicalRecord  │  │ StudentDocument      │      │
│  │ (owned)  │  │ (owned)        │  │ (owned)              │      │
│  └──────────┘  └────────────────┘  └──────────────────────┘      │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐               │
│         ▼                    ▼                    ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ StudentPhoto │  │ StudentNote  │  │ EmergencyContact     │   │
│  │ (owned)      │  │ (owned)      │  │ (owned)              │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              StudentStatusHistory (owned)                  │   │
│  │  - status transitions (immutable log)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Dependency Diagram

### 10.1 Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCREENS / UI LAYER                                │
│  ┌──────────────────────┐  ┌──────────────────────────┐            │
│  │   StudentsScreen     │  │   StudentProfileScreen   │            │
│  └──────────┬───────────┘  └──────────┬───────────────┘            │
│             │                         │                              │
│             ▼                         ▼                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               APPLICATION LAYER (Hooks)                       │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  useStudents() — orchestrates UI state, calls service  │   │   │
│  │  └──────────────────────┬────────────────────────────────┘   │   │
│  └─────────────────────────┼────────────────────────────────────┘   │
│                            │                                          │
│                            ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               DOMAIN LAYER (Services)                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │AdmissionSvc  │  │EnrollmentSvc │  │PromotionSvc     │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬──────────┘   │   │
│  │         │                 │                   │                │   │
│  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────┴──────────┐   │   │
│  │  │GraduationSvc │  │TransferSvc   │  │DisciplineSvc    │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬──────────┘   │   │
│  │         │                 │                   │                │   │
│  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌───────┴──────────┐   │   │
│  │  │GuardianSvc   │  │StatusSvc     │  │StudentSearchSvc │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│  └─────────────────────────┼────────────────────────────────────┘   │
│                            │                                          │
│                            ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               INFRASTRUCTURE LAYER                            │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  IStudentDomainRepository (interface)                   │   │   │
│  │  └──────────────────────┬────────────────────────────────┘   │   │
│  │                         │                                      │   │
│  │  ┌──────────────────────┴────────────────────────────────┐   │   │
│  │  │  StudentDomainRepository implements IStudentDomainRepo  │   │   │
│  │  │  - Uses IDataSource for persistence                     │   │   │
│  │  │  - Maps domain objects to/from persistence models       │   │   │
│  │  └──────────────────────┬────────────────────────────────┘   │   │
│  │                         │                                      │   │
│  │  ┌──────────────────────┴────────────────────────────────┐   │   │
│  │  │  IDataSource (core/datasource) — SQLite/PostgreSQL    │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  CROSS-CUTTING:                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐         │
│  │ EventBus │  │ ILogger  │  │ IValidator│  │ AppError  │         │
│  └──────────┘  └──────────┘  └───────────┘  └───────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Package Structure (Proposed)

```
src/domain/student/
├── aggregates/
│   └── Student.ts                    # Aggregate root
├── entities/
│   ├── Guardian.ts
│   ├── StudentDocument.ts
│   ├── MedicalRecord.ts
│   ├── StudentPhoto.ts
│   ├── StudentNote.ts
│   ├── EmergencyContact.ts
│   ├── StudentStatusHistory.ts
│   ├── Enrollment.ts
│   ├── AcademicRecord.ts
│   ├── StudentTransfer.ts
│   ├── StudentPromotion.ts
│   ├── StudentGraduation.ts
│   ├── StudentDiscipline.ts
│   └── StudentAttendanceSummary.ts
├── value-objects/
│   ├── StudentId.ts
│   ├── AcademicId.ts
│   ├── FullName.ts
│   ├── NationalId.ts
│   ├── BirthDate.ts
│   ├── Gender.ts
│   ├── PhoneNumber.ts
│   ├── Email.ts
│   ├── Address.ts
│   ├── StudentStatus.ts
│   ├── BloodType.ts
│   ├── GuardianRelationship.ts
│   ├── Gpa.ts
│   ├── Percentage.ts
│   ├── GradeLabel.ts
│   ├── DocumentType.ts
│   ├── EnrollmentType.ts
│   ├── TransferType.ts
│   ├── IncidentType.ts
│   ├── DisciplinaryAction.ts
│   └── Timestamp.ts
├── events/
│   ├── StudentAdmittedEvent.ts
│   ├── StudentRegisteredEvent.ts
│   ├── StudentEnrolledEvent.ts
│   ├── StudentTransferredEvent.ts
│   ├── StudentGraduatedEvent.ts
│   ├── StudentPromotedEvent.ts
│   ├── GuardianAssignedEvent.ts
│   ├── GuardianRemovedEvent.ts
│   ├── StudentSuspendedEvent.ts
│   ├── StudentReactivatedEvent.ts
│   ├── StudentAtRiskIdentifiedEvent.ts
│   ├── StudentArchivedEvent.ts
│   ├── StudentStatusChangedEvent.ts
│   └── index.ts
├── policies/
│   ├── AdmissionPolicy.ts
│   ├── PromotionPolicy.ts
│   ├── TransferPolicy.ts
│   ├── GraduationPolicy.ts
│   ├── AgeValidationPolicy.ts
│   ├── EnrollmentPolicy.ts
│   ├── SuspensionPolicy.ts
│   ├── AtRiskPolicy.ts
│   └── index.ts
├── services/
│   ├── AdmissionService.ts
│   ├── EnrollmentService.ts
│   ├── PromotionService.ts
│   ├── GraduationService.ts
│   ├── TransferService.ts
│   ├── GuardianAssignmentService.ts
│   ├── StudentStatusService.ts
│   ├── DisciplineService.ts
│   ├── DocumentService.ts
│   ├── MedicalService.ts
│   ├── StudentSearchService.ts
│   └── index.ts
├── repositories/
│   ├── IStudentDomainRepository.ts
│   └── index.ts
├── factories/
│   ├── StudentFactory.ts
│   └── index.ts
└── index.ts                          # Barrel exports
```

---

## 11. State Machine — Student Lifecycle

### 11.1 State Diagram

```
                     ┌─────────────┐
                     │  APPLICANT  │
                     └──────┬──────┘
                            │ Admission approved
                            ▼
                     ┌─────────────┐
                     │  ACCEPTED   │
                     └──────┬──────┘
                            │ Enrollment completed
                            ▼
                     ┌─────────────┐
                     │  ENROLLED   │
                     └──────┬──────┘
                            │ Classes started
                            ▼
               ┌─────────────────────┐
    ┌──────────│       ACTIVE        │◄──────────┐
    │          └──────┬─────────┬────┘           │
    │                 │         │                 │
    │   GPA < 60%     │         │ Suspension     │
    │   or Att < 70%  │         │ ended          │
    │                 ▼         │                 │
    │          ┌──────────┐     │                 │
    │          │ AT-RISK  │     │                 │
    │          └─────┬────┘     │                 │
    │                │           │                 │
    │    Intervention│           │                 │
    │    successful  │           │                 │
    │                ├───────────┘                 │
    │                │                             │
    └────────────────┘                             │
                                                   │
                           ┌───────────────────────┘
                           │ Suspension initiated
                           ▼
                    ┌──────────────┐
                    │  SUSPENDED   │
                    └──────┬───────┘
                           │ Suspension ended
                           │ (back to ACTIVE)
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
        ┌──────────────┐     ┌────────────────┐
        │ TRANSFERRED  │     │  GRADUATED     │
        └──────┬───────┘     └───────┬────────┘
               │                     │
               └─────────┬───────────┘
                         │ Lifecycle end
                         ▼
                  ┌──────────────┐
                  │   ARCHIVED   │
                  └──────────────┘
```

### 11.2 State Transition Table

| From ↓ \ To → | Applicant | Accepted | Enrolled | Active | At-Risk | Suspended | Transferred | Graduated | Archived |
|---------------|-----------|----------|----------|--------|---------|-----------|-------------|-----------|----------|
| **Applicant** | — | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Accepted** | ❌ | — | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Enrolled** | ❌ | ❌ | — | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Active** | ❌ | ❌ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ❌ |
| **At-Risk** | ❌ | ❌ | ❌ | ✅ | — | ✅ | ✅ | ❌ | ❌ |
| **Suspended** | ❌ | ❌ | ❌ | ✅ | ❌ | — | ❌ | ❌ | ❌ |
| **Transferred** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **Graduated** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | ✅ |
| **Archived** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

### 11.3 Valid Transition Rules

```typescript
const VALID_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  [StudentStatus.APPLICANT]:   [StudentStatus.ACCEPTED],
  [StudentStatus.ACCEPTED]:    [StudentStatus.ENROLLED],
  [StudentStatus.ENROLLED]:    [StudentStatus.ACTIVE],
  [StudentStatus.ACTIVE]:      [StudentStatus.AT_RISK, StudentStatus.SUSPENDED, StudentStatus.TRANSFERRED, StudentStatus.GRADUATED],
  [StudentStatus.AT_RISK]:     [StudentStatus.ACTIVE, StudentStatus.SUSPENDED, StudentStatus.TRANSFERRED],
  [StudentStatus.SUSPENDED]:   [StudentStatus.ACTIVE],
  [StudentStatus.TRANSFERRED]: [StudentStatus.ARCHIVED],
  [StudentStatus.GRADUATED]:   [StudentStatus.ARCHIVED],
  [StudentStatus.ARCHIVED]:    [],  // Terminal state
};
```

---

## 12. Repository Interfaces

### 12.1 Domain Repository Interface

```typescript
interface IStudentDomainRepository {
  // Core CRUD
  getById(id: StudentId): Student | null;
  getByAcademicId(academicId: AcademicId): Student | null;
  save(student: Student): void;
  delete(id: StudentId): boolean;

  // Query methods
  getAll(): Student[];
  getByStatus(status: StudentStatus): Student[];
  getByClass(classId: ClassId): Student[];
  getBySection(sectionId: SectionId): Student[];
  getByGuardian(guardianId: GuardianId): Student[];
  getByAcademicYear(academicYearId: AcademicYearId): Student[];

  // Search
  search(criteria: StudentSearchCriteria): Student[];

  // Specifications
  findSatisfying(specification: Specification<Student>): Student[];

  // Child entity persistence
  saveGuardian(guardian: Guardian): void;
  removeGuardian(guardianId: GuardianId): void;
  getGuardians(studentId: StudentId): Guardian[];

  saveDocument(document: StudentDocument): void;
  removeDocument(documentId: DocumentId): void;
  getDocuments(studentId: StudentId): StudentDocument[];

  saveMedicalRecord(record: MedicalRecord): void;
  getMedicalRecord(studentId: StudentId): MedicalRecord | null;

  savePhoto(photo: StudentPhoto): void;
  getPhotos(studentId: StudentId): StudentPhoto[];

  saveNote(note: StudentNote): void;
  getNotes(studentId: StudentId): StudentNote[];

  saveEmergencyContact(contact: EmergencyContact): void;
  getEmergencyContacts(studentId: StudentId): EmergencyContact[];

  // Status history
  getStatusHistory(studentId: StudentId): StudentStatusHistory[];

  // Unit of Work
  beginTransaction(): void;
  commit(): void;
  rollback(): void;
}
```

### 12.2 Specification Pattern

```typescript
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

// Example specifications
class ActiveStudentsSpecification implements Specification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.status === StudentStatus.ACTIVE;
  }
}

class AtRiskStudentsSpecification implements Specification<Student> {
  isSatisfiedBy(student: Student): boolean {
    return student.status === StudentStatus.AT_RISK;
  }
}

class GradeLevelSpecification implements Specification<Student> {
  constructor(private gradeLevel: GradeLevel) {}

  isSatisfiedBy(student: Student): boolean {
    return student.classId.equals(this.gradeLevel.classId);
  }
}
```

---

## 13. Domain Report

### 13.1 Summary

| Metric | Count |
|--------|-------|
| **Entities** | 15 |
| **Value Objects** | 30+ |
| **Domain Events** | 16 |
| **Business Policies** | 8 |
| **Domain Services** | 11 |
| **Aggregates** | 1 (Student Aggregate) |
| **State Transitions** | 14 valid transitions |
| **States** | 9 |

### 13.2 Entity Inventory

| # | Entity | Type | Aggregate | Persistence |
|---|--------|------|-----------|-------------|
| 1 | Student | Aggregate Root | Student | students table |
| 2 | Guardian | Owned Entity | Student | parents + parent_students tables |
| 3 | StudentDocument | Owned Entity | Student | student_documents table |
| 4 | MedicalRecord | Owned Entity | Student | medical_records table |
| 5 | StudentPhoto | Owned Entity | Student | student_photos table |
| 6 | EmergencyContact | Owned Entity | Student | emergency_contacts table |
| 7 | StudentNote | Owned Entity | Student | student_notes table |
| 8 | StudentStatusHistory | Owned Entity | Student | student_status_history table |
| 9 | Enrollment | Independent Entity | Enrollment | enrollments table |
| 10 | AcademicRecord | Independent Entity | AcademicRecord | grade_records + certificates tables |
| 11 | StudentTransfer | Independent Entity | StudentTransfer | student_transfers table |
| 12 | StudentPromotion | Independent Entity | StudentPromotion | student_promotions table |
| 13 | StudentGraduation | Independent Entity | StudentGraduation | student_graduations table |
| 14 | StudentDiscipline | Independent Entity | StudentDiscipline | student_discipline table |
| 15 | StudentAttendanceSummary | Independent Entity | AttendanceSummary | attendance_summary table |

### 13.3 Value Object Inventory

| # | Value Object | Mutable? | Used By |
|---|-------------|----------|---------|
| 1 | StudentId | Immutable | Student |
| 2 | AcademicId | Immutable | Student |
| 3 | UserId | Immutable | Student |
| 4 | FullName | Immutable | Student, Guardian |
| 5 | NationalId | Immutable | Student, Guardian |
| 6 | BirthDate | Immutable | Student |
| 7 | Gender | Immutable | Student |
| 8 | PhoneNumber | Immutable | Student, Guardian, EmergencyContact |
| 9 | Email | Immutable | Student, Guardian |
| 10 | Address | Immutable | Student, Guardian, EmergencyContact |
| 11 | Photo | Immutable | Student |
| 12 | ClassId | Immutable | Student, Enrollment |
| 13 | SectionId | Immutable | Student, Enrollment |
| 14 | EnrollmentDate | Immutable | Student, Enrollment |
| 15 | StudentStatus | Immutable | Student, StudentStatusHistory |
| 16 | HealthNotes | Immutable | Student |
| 17 | RfidCardId | Immutable | Student |
| 18 | Timestamp | Immutable | All entities |
| 19 | BloodType | Immutable | MedicalRecord |
| 20 | GuardianRelationship | Immutable | Guardian |
| 21 | EnrollmentType | Immutable | Enrollment |
| 22 | EnrollmentStatus | Immutable | Enrollment |
| 23 | Gpa | Immutable | AcademicRecord, StudentGraduation |
| 24 | Percentage | Immutable | AcademicRecord, StudentGraduation, AttendanceSummary |
| 25 | GradeLabel | Immutable | AcademicRecord |
| 26 | Rank | Immutable | AcademicRecord, StudentGraduation |
| 27 | DocumentType | Immutable | StudentDocument |
| 28 | TransferType | Immutable | StudentTransfer |
| 29 | TransferStatus | Immutable | StudentTransfer |
| 30 | PromotionStatus | Immutable | StudentPromotion |
| 31 | GraduationStatus | Immutable | StudentGraduation |
| 32 | IncidentType | Immutable | StudentDiscipline |
| 33 | DisciplinaryAction | Immutable | StudentDiscipline |
| 34 | DisciplineStatus | Immutable | StudentDiscipline |
| 35 | NoteCategory | Immutable | StudentNote |

### 13.4 Domain Event Inventory

| # | Event | Publisher | Subscribers |
|---|-------|-----------|-------------|
| 1 | StudentAdmitted | AdmissionService | Notification, Audit, User |
| 2 | StudentRegistered | EnrollmentService | Notification, Academic, Financial |
| 3 | StudentEnrolled | EnrollmentService | Attendance, Financial, Library |
| 4 | StudentTransferred | TransferService | Academic, Attendance, Notification |
| 5 | StudentGraduated | GraduationService | Academic, Notification, Alumni |
| 6 | StudentPromoted | PromotionService | Academic, Enrollment |
| 7 | GuardianAssigned | GuardianAssignmentService | Notification |
| 8 | GuardianRemoved | GuardianAssignmentService | Notification |
| 9 | StudentSuspended | DisciplineService | Notification, Attendance |
| 10 | StudentReactivated | StudentStatusService | Notification, Attendance |
| 11 | StudentAtRiskIdentified | StudentStatusService | Academic, Notification |
| 12 | StudentArchived | StudentStatusService | All subscribers |
| 13 | StudentStatusChanged | StudentStatusService | Audit, Notification |
| 14 | StudentPhotoUpdated | DocumentService | Profile |
| 15 | StudentDocumentUploaded | DocumentService | Document |
| 16 | StudentMedicalRecordUpdated | MedicalService | Health, Emergency |
| 17 | StudentPersonalInfoUpdated | Student | Audit |

### 13.5 Business Policy Inventory

| # | Policy | Domain Service | Specification |
|---|--------|---------------|---------------|
| 1 | AdmissionPolicy | AdmissionService | AdmissionPolicySpec |
| 2 | PromotionPolicy | PromotionService | PromotionPolicySpec |
| 3 | TransferPolicy | TransferService | TransferPolicySpec |
| 4 | GraduationPolicy | GraduationService | GraduationPolicySpec |
| 5 | AgeValidationPolicy | AdmissionService, EnrollmentService | AgeValidationSpec |
| 6 | EnrollmentPolicy | EnrollmentService | EnrollmentPolicySpec |
| 7 | SuspensionPolicy | DisciplineService | SuspensionPolicySpec |
| 8 | AtRiskPolicy | StudentStatusService | AtRiskPolicySpec |

### 13.6 Domain Service Inventory

| # | Service | Dependencies | Events Published |
|---|---------|-------------|-----------------|
| 1 | AdmissionService | StudentRepo, EventBus, AdmissionPolicy, AgeValidationPolicy | StudentAdmitted |
| 2 | EnrollmentService | StudentRepo, EnrollmentRepo, EventBus, EnrollmentPolicy | StudentRegistered, StudentEnrolled |
| 3 | PromotionService | StudentRepo, PromotionRepo, EventBus, PromotionPolicy | StudentPromoted |
| 4 | GraduationService | StudentRepo, GraduationRepo, EventBus, GraduationPolicy | StudentGraduated |
| 5 | TransferService | StudentRepo, TransferRepo, EventBus, TransferPolicy | StudentTransferred |
| 6 | GuardianAssignmentService | StudentRepo, GuardianRepo, EventBus | GuardianAssigned, GuardianRemoved |
| 7 | StudentStatusService | StudentRepo, EventBus, AtRiskPolicy | StudentStatusChanged, StudentAtRiskIdentified, StudentReactivated, StudentArchived |
| 8 | DisciplineService | StudentRepo, DisciplineRepo, EventBus, SuspensionPolicy | StudentSuspended |
| 9 | DocumentService | StudentRepo, DocumentRepo, StorageProvider | StudentPhotoUpdated, StudentDocumentUploaded |
| 10 | MedicalService | StudentRepo, MedicalRepo | StudentMedicalRecordUpdated |
| 11 | StudentSearchService | StudentRepo | None |

### 13.7 Relationships

```
                     ┌──────────────────────────────┐
                     │           MASTER DATA         │
                     │  ┌──────────┐  ┌───────────┐  │
                     │  │  Class   │  │  Section  │  │
                     │  └────┬─────┘  └─────┬─────┘  │
                     └───────┼───────────────┼────────┘
                             │               │
                             │ references    │ references
                             ▼               ▼
┌──────────────┐     ┌────────────────────────────────┐     ┌──────────────────┐
│   FINANCIAL  │     │         STUDENT AGGREGATE      │     │    ATTENDANCE    │
│  (Payments)  │────▶│  ┌──────────────────────────┐  │◀────│  (Attendance     │
│              │     │  │       Student (Root)      │  │     │   Records)      │
│              │     │  │  - status lifecycle       │  │     │                  │
│              │     │  │  - guardians              │  │     │                  │
│              │     │  │  - documents              │  │     │                  │
│              │     │  │  - medical                │  │     │                  │
│              │     │  │  - photos                 │  │     │                  │
│              │     │  │  - notes                  │  │     │                  │
│              │     │  │  - emergency contacts     │  │     │                  │
│              │     │  └──────────────────────────┘  │     │                  │
│              │     └────────────────────────────────┘     │                  │
└──────────────┘                    │                        └──────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    ENROLLMENT    │    │  ACADEMIC        │    │  TRANSFER /     │
│  (Per Academic   │    │  RECORD          │    │  PROMOTION /    │
│   Year/Term)     │    │  (Grades, GPA)   │    │  GRADUATION     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   CERTIFICATE    │
                    │  (GPA, Rank)     │
                    └──────────────────┘
```

### 13.8 State Machine Summary

```
States: 9 (Applicant → Accepted → Enrolled → Active → At-Risk → Suspended → Transferred → Graduated → Archived)
Valid Transitions: 14
Terminal States: 1 (Archived)
Guarded Transitions: 8 (each guarded by corresponding business policy)
Event on Transition: 9 (each state change publishes a domain event)
```

---

## 14. Future Extensions

### 14.1 Short-term (Phase 2 Implementation)

| Extension | Description |
|-----------|-------------|
| **Student Domain Model Implementation** | Create all domain entities, value objects, aggregates as TypeScript classes with behavior |
| **Domain Repository Implementation** | Implement `IStudentDomainRepository` with SQLite persistence and object mapping |
| **Domain Services Implementation** | Implement all 11 domain services with policy injection |
| **Event Wiring** | Wire domain events to `EventBus` and create subscribers |
| **State Machine Enforcement** | Implement `StudentStatusService` with transition validation |
| **Policy Specifications** | Implement all 8 business policies as specification classes |

### 14.2 Medium-term

| Extension | Description |
|-----------|-------------|
| **Student Photo Management** | Upload, crop, thumbnail generation, multiple photos per student |
| **Document Verification Workflow** | Upload → Verify → Approve/Reject workflow for student documents |
| **Batch Operations** | Batch admit, promote, graduate, transfer students |
| **Student Import/Export** | CSV/Excel import/export with validation |
| **Student Timeline** | Visual timeline of all student events (status changes, grades, incidents) |
| **Advanced Search** | Full-text search across student data, filtering by multiple criteria |

### 14.3 Long-term

| Extension | Description |
|-----------|-------------|
| **Alumni Module** | Graduated students become alumni with separate tracking |
| **Sibling Detection** | Auto-detect sibling relationships from guardian data |
| **Student Analytics** | Predictive analytics for at-risk identification, performance trends |
| **Integration with National ID System** | Real-time national ID validation |
| **Parent Portal API** | REST API for parents to view student data |
| **Multi-Branch Support** | Student transfers between school branches |
| **Custom Student Fields** | Configurable custom fields per education stage |
| **Student Health Tracking** | Vaccination records, growth charts, medical appointment scheduling |

---

## Appendix A: Current Architecture Compliance

### A.1 Dependency Inversion Principle

**Current State:** `StudentRepository` implements `IStudentRepository` (interface in `core/repositories/`). Constructor receives `IDataSource`.

**Domain Compliance:** ✅ The existing repository pattern inverts the dependency correctly. The domain layer will define `IStudentDomainRepository` (richer, domain-specific), and the infrastructure layer will implement it.

### A.2 Event Bus Integration

**Current State:** `EventBus` exists in `src/core/events/` with `publish`, `subscribe`, `unsubscribe` methods.

**Domain Compliance:** ✅ Domain events will use `IEventBus` for publishing. The `EventBus` implementation is already in place.

### A.3 Error Handling

**Current State:** `AppError` hierarchy with `BusinessError`, `ValidationError`, `DatabaseError`, etc.

**Domain Compliance:** ✅ Domain services will throw `BusinessError` for policy violations and `ValidationError` for invalid data.

### A.4 Validation

**Current State:** `IValidator` interface and `validators.ts` with reusable validation functions.

**Domain Compliance:** ✅ Value Objects will perform self-validation in constructors. Domain services will use policy specifications for business rule validation.

### A.5 DI Container

**Current State:** `Container` class in `src/core/di/` with `register`, `registerInstance`, `resolve`.

**Domain Compliance:** ✅ Domain services will be registered in the DI container and resolved through the composition root.

---

*End of Domain Analysis Document*

**Next Steps:** Phase 2 Implementation — Code generation of domain model following this design.
