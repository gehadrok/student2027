/**
 * Master Data Utilities
 */

/**
 * Generate next number from system numbering config
 */
export function generateNextNumber(
  prefix: string,
  nextNumber: number,
  padLength: number
): string {
  const padded = String(nextNumber).padStart(padLength, '0');
  return `${prefix}${padded}`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength) + '...';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `md_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Get current user name from localStorage
 */
export function getCurrentUserName(): string {
  try {
    const raw = localStorage.getItem('al_salam_school_current_user_v1');
    if (raw) {
      const user = JSON.parse(raw);
      return user?.name || 'مدير النظام';
    }
  } catch {}
  return 'مدير النظام';
}

/**
 * Get current user ID from localStorage
 */
export function getCurrentUserId(): string {
  try {
    const raw = localStorage.getItem('al_salam_school_current_user_v1');
    if (raw) {
      const user = JSON.parse(raw);
      return user?.id || 'sys';
    }
  } catch {}
  return 'sys';
}

/**
 * Build SQL WHERE clause for search
 */
export function buildSearchWhere(
  searchQuery: string | undefined,
  searchFields: string[],
  extraConditions: string[] = []
): { whereClause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  if (searchQuery && searchQuery.trim()) {
    const q = `%${searchQuery.trim()}%`;
    const searchConditions = searchFields.map(f => `${f} LIKE ?`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
    searchFields.forEach(() => params.push(q));
  }

  extraConditions.forEach(c => {
    if (c) conditions.push(c);
  });

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

/**
 * Clone object for audit logging (remove circular refs)
 */
export function cloneForAudit(obj: any): any {
  try {
    return JSON.parse(JSON.stringify(obj || {}));
  } catch {
    return {};
  }
}

/**
 * Map entity types to their parent entity config
 */
export function getParentConfig(entityType: string): { parentField: string; parentTable: string; parentLabelField: string } | null {
  const parentMap: Record<string, { parentField: string; parentTable: string; parentLabelField: string }> = {
    academic_terms: { parentField: 'academic_year_id', parentTable: 'academic_years', parentLabelField: 'name_ar' },
    grade_levels: { parentField: 'education_stage_id', parentTable: 'education_stages', parentLabelField: 'name_ar' },
    sections_master: { parentField: 'grade_level_id', parentTable: 'grade_levels', parentLabelField: 'name_ar' },
    subjects_master: { parentField: 'grade_level_id', parentTable: 'grade_levels', parentLabelField: 'name_ar' },
    countries: { parentField: 'nationality_id', parentTable: 'nationalities', parentLabelField: 'name_ar' },
    governorates: { parentField: 'country_id', parentTable: 'countries', parentLabelField: 'name_ar' },
    districts: { parentField: 'governorate_id', parentTable: 'governorates', parentLabelField: 'name_ar' },
    cities: { parentField: 'governorate_id', parentTable: 'governorates', parentLabelField: 'name_ar' },
    job_titles: { parentField: 'employee_type_id', parentTable: 'employee_types', parentLabelField: 'name_ar' },
    departments: { parentField: 'parent_department_id', parentTable: 'departments', parentLabelField: 'name_ar' },
    rooms: { parentField: 'building_id', parentTable: 'buildings', parentLabelField: 'name_ar' },
  };
  return parentMap[entityType] || null;
}

/**
 * Get field definitions for form rendering per entity type
 */
export function getEntityFields(entityType: string): Array<{
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
}> {
  const commonFields = [
    { name: 'code', label: 'الكود', type: 'text' as const, required: true },
    { name: 'name_ar', label: 'الاسم (عربي)', type: 'text' as const, required: true },
    { name: 'name_en', label: 'الاسم (إنجليزي)', type: 'text' as const },
    { name: 'description', label: 'الوصف', type: 'textarea' as const },
    { name: 'is_active', label: 'نشط', type: 'checkbox' as const },
    { name: 'display_order', label: 'ترتيب العرض', type: 'number' as const },
  ];

  const entitySpecificFields: Record<string, any[]> = {
    academic_years: [
      { name: 'start_date', label: 'تاريخ البداية', type: 'date', required: true },
      { name: 'end_date', label: 'تاريخ النهاية', type: 'date', required: true },
      { name: 'is_current', label: 'العام الحالي', type: 'checkbox' },
    ],
    academic_terms: [
      { name: 'academic_year_id', label: 'العام الدراسي', type: 'select', required: true },
      { name: 'start_date', label: 'تاريخ البداية', type: 'date', required: true },
      { name: 'end_date', label: 'تاريخ النهاية', type: 'date', required: true },
      { name: 'is_current', label: 'الفصل الحالي', type: 'checkbox' },
    ],
    grade_levels: [
      { name: 'education_stage_id', label: 'المرحلة التعليمية', type: 'select' },
      { name: 'level_number', label: 'رقم المستوى', type: 'number', required: true, min: 1, max: 12 },
    ],
    sections_master: [
      { name: 'grade_level_id', label: 'الصف الدراسي', type: 'select' },
      { name: 'capacity', label: 'السعة', type: 'number', min: 1 },
    ],
    subjects_master: [
      { name: 'grade_level_id', label: 'الصف الدراسي', type: 'select' },
      { name: 'weekly_hours', label: 'الساعات الأسبوعية', type: 'number', min: 1 },
      { name: 'max_score', label: 'الدرجة العظمى', type: 'number', min: 1 },
      { name: 'pass_score', label: 'درجة النجاح', type: 'number', min: 0 },
    ],
    exam_types: [
      { name: 'weight_percent', label: 'نسبة الوزن (%)', type: 'number', min: 0, max: 100 },
    ],
    leave_types: [
      { name: 'is_paid', label: 'مدفوعة الأجر', type: 'checkbox' },
      { name: 'max_days', label: 'الحد الأقصى (أيام)', type: 'number', min: 0 },
    ],
    countries: [
      { name: 'nationality_id', label: 'الجنسية', type: 'select' },
    ],
    governorates: [
      { name: 'country_id', label: 'الدولة', type: 'select', required: true },
    ],
    districts: [
      { name: 'governorate_id', label: 'المحافظة', type: 'select', required: true },
    ],
    cities: [
      { name: 'governorate_id', label: 'المحافظة', type: 'select', required: true },
    ],
    job_titles: [
      { name: 'employee_type_id', label: 'نوع الموظف', type: 'select' },
    ],
    departments: [
      { name: 'parent_department_id', label: 'القسم الرئيسي', type: 'select' },
    ],
    buildings: [
      { name: 'floors_count', label: 'عدد الطوابق', type: 'number', min: 1 },
      { name: 'address', label: 'العنوان', type: 'textarea' },
    ],
    rooms: [
      { name: 'building_id', label: 'المبنى', type: 'select' },
      { name: 'floor_number', label: 'رقم الطابق', type: 'number', min: 0 },
      { name: 'capacity', label: 'السعة', type: 'number', min: 1 },
      { name: 'room_type', label: 'نوع الغرفة', type: 'select' },
    ],
    laboratories: [
      { name: 'building_id', label: 'المبنى', type: 'select' },
      { name: 'room_id', label: 'الغرفة', type: 'select' },
      { name: 'lab_type', label: 'نوع المختبر', type: 'select' },
      { name: 'capacity', label: 'السعة', type: 'number', min: 1 },
    ],
    libraries: [
      { name: 'building_id', label: 'المبنى', type: 'select' },
      { name: 'room_id', label: 'الغرفة', type: 'select' },
      { name: 'capacity', label: 'السعة', type: 'number', min: 1 },
      { name: 'books_count', label: 'عدد الكتب', type: 'number', min: 0 },
      { name: 'librarian_name', label: 'اسم أمين المكتبة', type: 'text' },
    ],
    fee_categories: [
      { name: 'amount', label: 'المبلغ', type: 'number', min: 0 },
      { name: 'is_recurring', label: 'متكرر', type: 'checkbox' },
    ],
    discount_types: [
      { name: 'discount_percent', label: 'نسبة الخصم (%)', type: 'number', min: 0, max: 100 },
    ],
    currencies: [
      { name: 'symbol', label: 'الرمز', type: 'text' },
      { name: 'exchange_rate', label: 'سعر الصرف', type: 'number', min: 0 },
      { name: 'is_base', label: 'العملة الأساسية', type: 'checkbox' },
    ],
    system_numbering: [
      { name: 'prefix', label: 'البادئة', type: 'text', required: true },
      { name: 'next_number', label: 'الرقم التالي', type: 'number', required: true, min: 1 },
      { name: 'step', label: 'الخطوة', type: 'number', required: true, min: 1 },
      { name: 'pad_length', label: 'طول الرقم', type: 'number', required: true, min: 1, max: 10 },
    ],
    school_branches: [
      { name: 'address', label: 'العنوان', type: 'textarea' },
      { name: 'phone', label: 'الهاتف', type: 'text' },
      { name: 'email', label: 'البريد الإلكتروني', type: 'text' },
      { name: 'principal_name', label: 'اسم المدير', type: 'text' },
    ],
  };

  const specific = entitySpecificFields[entityType] || [];
  return [...specific, ...commonFields];
}

