import { MasterDataCategory, MasterDataEntityInfo } from '../types';

/**
 * ============================================================================
 * MASTER DATA CATEGORY GROUPS
 * ============================================================================
 */
export const MASTER_DATA_CATEGORIES: MasterDataCategory[] = [
  {
    id: 'academic',
    name_ar: 'البيانات الأكاديمية',
    name_en: 'Academic',
    icon: 'GraduationCap',
    entities: [
      {
        entityType: 'academic_years',
        tableName: 'academic_years',
        nameAr: 'السنوات الدراسية',
        nameEn: 'Academic Years',
        icon: 'Calendar',
        description: 'إدارة السنوات الدراسية وتحديد العام الحالي'
      },
      {
        entityType: 'academic_terms',
        tableName: 'academic_terms',
        nameAr: 'الفصول الدراسية',
        nameEn: 'Academic Terms',
        icon: 'CalendarDays',
        description: 'إدارة الفصول الدراسية ضمن كل عام دراسي',
        hasParent: true,
        parentEntity: 'academic_years',
        parentField: 'academic_year_id',
        parentLabel: 'العام الدراسي'
      },
      {
        entityType: 'education_stages',
        tableName: 'education_stages',
        nameAr: 'المراحل التعليمية',
        nameEn: 'Education Stages',
        icon: 'Layers',
        description: 'تصنيف المراحل التعليمية (ابتدائي - متوسط - ثانوي)'
      },
      {
        entityType: 'grade_levels',
        tableName: 'grade_levels',
        nameAr: 'الصفوف الدراسية',
        nameEn: 'Grade Levels',
        icon: 'Layers',
        description: 'إدارة الصفوف الدراسية ضمن كل مرحلة تعليمية',
        hasParent: true,
        parentEntity: 'education_stages',
        parentField: 'education_stage_id',
        parentLabel: 'المرحلة التعليمية'
      },
      {
        entityType: 'sections_master',
        tableName: 'sections_master',
        nameAr: 'الشعب الدراسية',
        nameEn: 'Sections',
        icon: 'Layers',
        description: 'إدارة الشعب الدراسية ضمن كل صف',
        hasParent: true,
        parentEntity: 'grade_levels',
        parentField: 'grade_level_id',
        parentLabel: 'الصف الدراسي'
      },
      {
        entityType: 'subjects_master',
        tableName: 'subjects_master',
        nameAr: 'المواد الدراسية',
        nameEn: 'Subjects',
        icon: 'BookOpen',
        description: 'إدارة المواد الدراسية ضمن كل صف',
        hasParent: true,
        parentEntity: 'grade_levels',
        parentField: 'grade_level_id',
        parentLabel: 'الصف الدراسي'
      },
      {
        entityType: 'exam_types',
        tableName: 'exam_types',
        nameAr: 'أنواع الاختبارات',
        nameEn: 'Exam Types',
        icon: 'FileText',
        description: 'تصنيف أنواع الاختبارات والتقييمات'
      },
      {
        entityType: 'certificate_types',
        tableName: 'certificate_types',
        nameAr: 'أنواع الشهادات',
        nameEn: 'Certificate Types',
        icon: 'Award',
        description: 'أنواع الشهادات الدراسية والتقديرية'
      },
      {
        entityType: 'attendance_types',
        tableName: 'attendance_types',
        nameAr: 'أنواع الحضور',
        nameEn: 'Attendance Types',
        icon: 'UserCheck',
        description: 'أنواع حالة الحضور والغياب'
      },
      {
        entityType: 'leave_types',
        tableName: 'leave_types',
        nameAr: 'أنواع الإجازات',
        nameEn: 'Leave Types',
        icon: 'CalendarOff',
        description: 'أنواع الإجازات للموظفين'
      },
      {
        entityType: 'academic_statuses',
        tableName: 'academic_statuses',
        nameAr: 'الحالات الأكاديمية',
        nameEn: 'Academic Statuses',
        icon: 'CheckCircle',
        description: 'الحالات الأكاديمية للطلاب'
      }
    ]
  },
  {
    id: 'geographic',
    name_ar: 'البيانات الجغرافية',
    name_en: 'Geographic',
    icon: 'Globe',
    entities: [
      {
        entityType: 'nationalities',
        tableName: 'nationalities',
        nameAr: 'الجنسيات',
        nameEn: 'Nationalities',
        icon: 'Globe',
        description: 'قائمة الجنسيات'
      },
      {
        entityType: 'countries',
        tableName: 'countries',
        nameAr: 'الدول',
        nameEn: 'Countries',
        icon: 'MapPin',
        description: 'قائمة الدول',
        hasParent: true,
        parentEntity: 'nationalities',
        parentField: 'nationality_id',
        parentLabel: 'الجنسية'
      },
      {
        entityType: 'governorates',
        tableName: 'governorates',
        nameAr: 'المحافظات',
        nameEn: 'Governorates',
        icon: 'Map',
        description: 'المحافظات ضمن كل دولة',
        hasParent: true,
        parentEntity: 'countries',
        parentField: 'country_id',
        parentLabel: 'الدولة'
      },
      {
        entityType: 'districts',
        tableName: 'districts',
        nameAr: 'المديريات',
        nameEn: 'Districts',
        icon: 'Map',
        description: 'المديريات ضمن كل محافظة',
        hasParent: true,
        parentEntity: 'governorates',
        parentField: 'governorate_id',
        parentLabel: 'المحافظة'
      },
      {
        entityType: 'cities',
        tableName: 'cities',
        nameAr: 'المدن',
        nameEn: 'Cities',
        icon: 'Building',
        description: 'المدن ضمن كل محافظة',
        hasParent: true,
        parentEntity: 'governorates',
        parentField: 'governorate_id',
        parentLabel: 'المحافظة'
      }
    ]
  },
  {
    id: 'hr',
    name_ar: 'الموارد البشرية',
    name_en: 'Human Resources',
    icon: 'Users',
    entities: [
      {
        entityType: 'employee_types',
        tableName: 'employee_types',
        nameAr: 'أنواع الموظفين',
        nameEn: 'Employee Types',
        icon: 'UserCircle',
        description: 'تصنيف أنواع الموظفين'
      },
      {
        entityType: 'qualifications',
        tableName: 'qualifications',
        nameAr: 'المؤهلات العلمية',
        nameEn: 'Qualifications',
        icon: 'Award',
        description: 'قائمة المؤهلات العلمية'
      },
      {
        entityType: 'specializations',
        tableName: 'specializations',
        nameAr: 'التخصصات',
        nameEn: 'Specializations',
        icon: 'BookOpen',
        description: 'التخصصات العلمية والمهنية'
      },
      {
        entityType: 'job_titles',
        tableName: 'job_titles',
        nameAr: 'المسميات الوظيفية',
        nameEn: 'Job Titles',
        icon: 'Briefcase',
        description: 'المسميات الوظيفية للموظفين',
        hasParent: true,
        parentEntity: 'employee_types',
        parentField: 'employee_type_id',
        parentLabel: 'نوع الموظف'
      },
      {
        entityType: 'departments',
        tableName: 'departments',
        nameAr: 'الأقسام',
        nameEn: 'Departments',
        icon: 'Building2',
        description: 'الأقسام الإدارية والتعليمية',
        hasParent: true,
        parentEntity: 'departments',
        parentField: 'parent_department_id',
        parentLabel: 'القسم الرئيسي'
      }
    ]
  },
  {
    id: 'facilities',
    name_ar: 'المرافق المدرسية',
    name_en: 'School Facilities',
    icon: 'Building',
    entities: [
      {
        entityType: 'buildings',
        tableName: 'buildings',
        nameAr: 'المباني',
        nameEn: 'Buildings',
        icon: 'Building',
        description: 'المباني التابعة للمدرسة'
      },
      {
        entityType: 'rooms',
        tableName: 'rooms',
        nameAr: 'الغرف',
        nameEn: 'Rooms',
        icon: 'DoorOpen',
        description: 'الغرف والقاعات ضمن المباني',
        hasParent: true,
        parentEntity: 'buildings',
        parentField: 'building_id',
        parentLabel: 'المبنى'
      },
      {
        entityType: 'laboratories',
        tableName: 'laboratories',
        nameAr: 'المختبرات',
        nameEn: 'Laboratories',
        icon: 'FlaskConical',
        description: 'المختبرات العلمية والحاسوبية'
      },
      {
        entityType: 'libraries',
        tableName: 'libraries',
        nameAr: 'المكتبات',
        nameEn: 'Libraries',
        icon: 'Library',
        description: 'المكتبات المدرسية'
      }
    ]
  },
  {
    id: 'financial',
    name_ar: 'البيانات المالية',
    name_en: 'Financial',
    icon: 'DollarSign',
    entities: [
      {
        entityType: 'fee_categories',
        tableName: 'fee_categories',
        nameAr: 'فئات الرسوم',
        nameEn: 'Fee Categories',
        icon: 'Receipt',
        description: 'فئات الرسوم الدراسية'
      },
      {
        entityType: 'payment_methods',
        tableName: 'payment_methods',
        nameAr: 'طرق الدفع',
        nameEn: 'Payment Methods',
        icon: 'CreditCard',
        description: 'طرق الدفع المتاحة'
      },
      {
        entityType: 'discount_types',
        tableName: 'discount_types',
        nameAr: 'أنواع الخصومات',
        nameEn: 'Discount Types',
        icon: 'Percent',
        description: 'أنواع الخصومات والتخفيضات'
      },
      {
        entityType: 'currencies',
        tableName: 'currencies',
        nameAr: 'العملات',
        nameEn: 'Currencies',
        icon: 'CircleDollarSign',
        description: 'العملات المدعومة في النظام'
      }
    ]
  },
  {
    id: 'system',
    name_ar: 'بيانات النظام',
    name_en: 'System',
    icon: 'Settings',
    entities: [
      {
        entityType: 'system_numbering',
        tableName: 'system_numbering',
        nameAr: 'الترقيم الآلي',
        nameEn: 'System Numbering',
        icon: 'Hash',
        description: 'إعدادات الترقيم الآلي للطلاب والموظفين'
      },
      {
        entityType: 'school_branches',
        tableName: 'school_branches',
        nameAr: 'فروع المدرسة',
        nameEn: 'School Branches',
        icon: 'Building2',
        description: 'فروع المدرسة إن وجدت'
      }
    ]
  },
  {
    id: 'identity',
    name_ar: 'الهوية',
    name_en: 'Identity',
    icon: 'IdCard',
    entities: [
      {
        entityType: 'identity_types',
        tableName: 'identity_types',
        nameAr: 'أنواع الهوية',
        nameEn: 'Identity Types',
        icon: 'IdCard',
        description: 'أناث وثائق الهوية الشخصية'
      }
    ]
  },
  {
    id: 'documents',
    name_ar: 'الوثائق',
    name_en: 'Documents',
    icon: 'FileText',
    entities: [
      {
        entityType: 'document_types',
        tableName: 'document_types',
        nameAr: 'أنواع الوثائق',
        nameEn: 'Document Types',
        icon: 'FileText',
        description: 'تصنيف أنواع الوثائق والمستندات'
      }
    ]
  }
];

/**
 * ============================================================================
 * PERMISSION LABELS
 * ============================================================================
 */
export const PERMISSION_LABELS: Record<string, string> = {
  can_view: 'عرض',
  can_create: 'إضافة',
  can_edit: 'تعديل',
  can_delete: 'حذف',
  can_import: 'استيراد',
  can_export: 'تصدير'
};

/**
 * ============================================================================
 * UI CONSTANTS
 * ============================================================================
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

export const ENTITY_TYPE_ICONS: Record<string, string> = {
  academic_years: 'Calendar',
  academic_terms: 'CalendarDays',
  education_stages: 'Layers',
  grade_levels: 'Layers',
  sections_master: 'LayoutPanelTop',
  subjects_master: 'BookOpen',
  exam_types: 'FileText',
  certificate_types: 'Award',
  attendance_types: 'UserCheck',
  leave_types: 'CalendarOff',
  academic_statuses: 'CheckCircle',
  nationalities: 'Globe',
  countries: 'MapPin',
  governorates: 'Map',
  districts: 'Map',
  cities: 'Building',
  identity_types: 'IdCard',
  employee_types: 'UserCircle',
  qualifications: 'Award',
  specializations: 'BookOpen',
  job_titles: 'Briefcase',
  departments: 'Building2',
  buildings: 'Building',
  rooms: 'DoorOpen',
  laboratories: 'FlaskConical',
  libraries: 'Library',
  fee_categories: 'Receipt',
  payment_methods: 'CreditCard',
  discount_types: 'Percent',
  currencies: 'CircleDollarSign',
  system_numbering: 'Hash',
  school_branches: 'Building2',
  document_types: 'FileText'
};

/**
 * ============================================================================
 * ROOM TYPE LABELS
 * ============================================================================
 */
export const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'فصل دراسي',
  lab: 'مختبر',
  library: 'مكتبة',
  hall: 'قاعة',
  office: 'مكتب إداري',
  storage: 'مستودع',
  other: 'أخرى'
};

/**
 * ============================================================================
 * LAB TYPE LABELS
 * ============================================================================
 */
export const LAB_TYPE_LABELS: Record<string, string> = {
  physics: 'فيزياء',
  chemistry: 'كيمياء',
  biology: 'أحياء',
  computer: 'حاسوب',
  language: 'لغة',
  science: 'علوم عامة',
  other: 'أخرى'
};

