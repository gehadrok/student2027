/**
 * Master Data Types - Al-Salam School ERP
 * Enterprise-wide master data entity types
 */

export interface MasterDataEntity {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description: string | null;
  is_active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  [key: string]: any; // Allow entity-specific fields
}

export interface AcademicYear extends MasterDataEntity {
  start_date: string;
  end_date: string;
  is_current: number;
}

export interface AcademicTerm extends MasterDataEntity {
  academic_year_id: string;
  start_date: string;
  end_date: string;
  is_current: number;
  academic_year_name?: string;
}

export interface EducationStage extends MasterDataEntity {}

export interface GradeLevel extends MasterDataEntity {
  education_stage_id: string | null;
  level_number: number;
  education_stage_name?: string;
}

export interface SectionMaster extends MasterDataEntity {
  grade_level_id: string | null;
  capacity: number;
  grade_level_name?: string;
}

export interface SubjectMaster extends MasterDataEntity {
  grade_level_id: string | null;
  weekly_hours: number;
  max_score: number;
  pass_score: number;
  grade_level_name?: string;
}

export interface ExamType extends MasterDataEntity {
  weight_percent: number;
}

export interface CertificateType extends MasterDataEntity {}

export interface AttendanceType extends MasterDataEntity {}

export interface LeaveType extends MasterDataEntity {
  is_paid: number;
  max_days: number | null;
}

export interface AcademicStatus extends MasterDataEntity {}

export interface Nationality extends MasterDataEntity {}

export interface Country extends MasterDataEntity {
  nationality_id: string | null;
  nationality_name?: string;
}

export interface Governorate extends MasterDataEntity {
  country_id: string | null;
  country_name?: string;
}

export interface District extends MasterDataEntity {
  governorate_id: string | null;
  governorate_name?: string;
}

export interface City extends MasterDataEntity {
  governorate_id: string | null;
  governorate_name?: string;
}

export interface IdentityType extends MasterDataEntity {}

export interface EmployeeType extends MasterDataEntity {}

export interface Qualification extends MasterDataEntity {}

export interface Specialization extends MasterDataEntity {}

export interface JobTitle extends MasterDataEntity {
  employee_type_id: string | null;
  employee_type_name?: string;
}

export interface Department extends MasterDataEntity {
  parent_department_id: string | null;
  head_employee_id: string | null;
  parent_department_name?: string;
}

export interface Building extends MasterDataEntity {
  floors_count: number;
  address: string | null;
}

export interface Room extends MasterDataEntity {
  building_id: string | null;
  floor_number: number;
  capacity: number;
  room_type: 'classroom' | 'lab' | 'library' | 'hall' | 'office' | 'storage' | 'other';
  building_name?: string;
}

export interface Laboratory extends MasterDataEntity {
  building_id: string | null;
  room_id: string | null;
  lab_type: 'physics' | 'chemistry' | 'biology' | 'computer' | 'language' | 'science' | 'other';
  capacity: number;
  building_name?: string;
  room_name?: string;
}

export interface Library extends MasterDataEntity {
  building_id: string | null;
  room_id: string | null;
  capacity: number;
  books_count: number;
  librarian_name: string | null;
  building_name?: string;
  room_name?: string;
}

export interface FeeCategory extends MasterDataEntity {
  amount: number;
  is_recurring: number;
}

export interface PaymentMethod extends MasterDataEntity {}

export interface DiscountType extends MasterDataEntity {
  discount_percent: number;
}

export interface Currency extends MasterDataEntity {
  symbol: string | null;
  exchange_rate: number;
  is_base: number;
}

export interface SystemNumbering extends MasterDataEntity {
  prefix: string;
  next_number: number;
  step: number;
  pad_length: number;
}

export interface SchoolBranch extends MasterDataEntity {
  address: string | null;
  phone: string | null;
  email: string | null;
  principal_name: string | null;
}

export interface DocumentType extends MasterDataEntity {}

export interface MasterDataPermission {
  id: string;
  entity_type: string;
  can_view: number;
  can_create: number;
  can_edit: number;
  can_delete: number;
  can_import: number;
  can_export: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface MasterDataAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'PRINT';
  old_values: string | null;
  new_values: string | null;
  performed_by: string;
  performed_at: string;
  ip_address: string | null;
  details: string | null;
}

// Generic filter for master data
export interface MasterDataFilter {
  searchQuery?: string;
  is_active?: number | 'all';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// Category group definition
export interface MasterDataCategory {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  entities: MasterDataEntityInfo[];
}

export interface MasterDataEntityInfo {
  entityType: string;
  tableName: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  description: string;
  hasParent?: boolean;
  parentEntity?: string;
  parentField?: string;
  parentLabel?: string;
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Import/Export
export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf';
  entityType: string;
  filters?: MasterDataFilter;
  columns?: string[];
}

