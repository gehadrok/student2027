/**
 * Master Entity Constants
 * Centralized enum for all master data table names
 * Never hardcode table names - use this enum instead
 */
export const MasterEntity = {
  // Academic Structure (الهيكل الأكاديمي)
  AcademicYears: 'academic_years',
  AcademicTerms: 'academic_terms',
  EducationStages: 'education_stages',
  GradeLevels: 'grade_levels',
  SectionsMaster: 'sections_master',
  SubjectsMaster: 'subjects_master',

  // Examinations
  ExamTypes: 'exam_types',
  CertificateTypes: 'certificate_types',

  // Attendance
  AttendanceTypes: 'attendance_types',
  LeaveTypes: 'leave_types',
  AcademicStatuses: 'academic_statuses',

  // Geographic
  Nationalities: 'nationalities',
  Countries: 'countries',
  Governorates: 'governorates',
  Districts: 'districts',
  Cities: 'cities',

  // Identity & Documents
  IdentityTypes: 'identity_types',
  DocumentTypes: 'document_types',

  // Human Resources
  EmployeeTypes: 'employee_types',
  Qualifications: 'qualifications',
  Specializations: 'specializations',
  JobTitles: 'job_titles',
  Departments: 'departments',

  // School Facilities
  Buildings: 'buildings',
  Rooms: 'rooms',
  Laboratories: 'laboratories',
  Libraries: 'libraries',

  // Financial
  FeeCategories: 'fee_categories',
  PaymentMethods: 'payment_methods',
  DiscountTypes: 'discount_types',
  Currencies: 'currencies',

  // System
  SystemNumbering: 'system_numbering',
  SchoolBranches: 'school_branches',
} as const;

export type MasterEntityType = typeof MasterEntity[keyof typeof MasterEntity];

