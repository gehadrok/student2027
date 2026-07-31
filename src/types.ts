export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  passwordHash: string;
  phone: string;
  photo?: string;
  avatarColor?: string;
  linkedStudentIds?: string[]; // for parent or student
  linkedTeacherId?: string; // for teacher
  status: 'active' | 'suspended';
  lastLogin?: string;
}

export interface Student {
  id: string;
  userId: string;
  academicId: string; // e.g. STU-2026-001
  name: string;
  classId: string;
  sectionId: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  birthDate: string;
  gender: 'male' | 'female';
  photo?: string;
  status: 'active' | 'transferred' | 'graduated' | 'at-risk';
  healthNotes?: string;
  enrollmentDate: string;
}

export interface Teacher {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experienceYears: number;
  subjectIds: string[];
  classIds: string[];
  photo?: string;
  status: 'active' | 'on-leave';
}

export interface Parent {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  occupation?: string;
  studentIds: string[];
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "الصف الأول الثانوي"
  level: number; // 1 to 12
  sections: Section[];
}

export interface Section {
  id: string;
  name: string; // e.g. "شعبة أ" or "Section A"
  classId: string;
  roomNumber: string;
  capacity: number;
  supervisorTeacherId?: string;
}

export interface Subject {
  id: string;
  name: string; // e.g. "الرياضيات", "الفيزياء"
  code: string; // e.g. MATH101
  classId: string;
  teacherId: string;
  weeklyHours: number;
  maxScore: number;
  passScore: number;
  color?: string;
}

export type DayOfWeek = 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';

export interface SchedulePeriod {
  id: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  day: DayOfWeek;
  periodNumber: number; // 1 to 7
  startTime: string; // e.g. "07:30"
  endTime: string;   // e.g. "08:15"
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  sectionId: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string; // teacher or admin name
}

export type GradeType = 'quiz' | 'midterm' | 'final' | 'coursework' | 'activity';

export interface GradeRecord {
  id: string;
  studentId: string;
  subjectId: string;
  term: 'الفصل الأول' | 'الفصل الثاني' | 'الفصل الصيفي';
  type: GradeType;
  score: number;
  maxScore: number;
  weight: number; // percentage e.g. 20%
  date: string;
  teacherNotes?: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  term: 'الفصل الأول' | 'الفصل الثاني' | 'نهاية العام';
  academicYear: string; // e.g. "2025-2026"
  gpa: number; // out of 100 or 4.0
  percentage: number;
  gradeLabel: 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول';
  rankInClass: number;
  generatedDate: string;
  issuedBy: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial' | 'unpaid';

export interface FeePayment {
  id: string;
  studentId: string;
  receiptNumber?: string; // e.g. REC-9001
  title: string; // e.g. "قسط الفصل الأول - رسوم دراسية"
  totalAmount: number;
  amount: number; // alias for totalAmount
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
}

export type FinancialPayment = FeePayment;

export interface ExpenseRecord {
  id: string;
  voucherNumber: string; // e.g. EXP-4002
  category: 'رواتب مكافآت' | 'صيانة ومرافق' | 'مستلزمات مدرسية' | 'أنشطة وفعاليات' | 'أخرى';
  title: string;
  amount: number;
  date: string;
  beneficiary: string;
  approvedBy: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  userId?: string; // if null, global broadcast
  targetRole?: UserRole; // if set, sent to all users of that role
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. "إدخال درجات", "تعديل جدول", "تسجيل دفعة مالية"
  details: string;
  timestamp: string;
  ip?: string;
}

export interface SchoolSettings {
  schoolName: string;
  nameEn: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  adminName?: string;
  academicYear: string;
  currentTerm: string;
  logoUrl: string;
  primaryColor: string;
  enableSMSAlerts: boolean;
  enableAIAnalysis: boolean;
  attendanceLockHour: string; // e.g. "09:00"
  // Extended Enterprise Fields
  mobile?: string;
  ministryLicense?: string;
  taxNumber?: string;
  schoolCode?: string;
  city?: string;
  country?: string;
  language?: string;
  timeZone?: string;
  dateFormat?: string;
  currency?: string;
  stampUrl?: string;
  principalSignatureUrl?: string;
  reportHeader?: string;
  reportFooter?: string;
  passingGradeThreshold?: number;
  gradingSystem?: string;
  invoicePrefix?: string;
  receiptPrefix?: string;
  paperSize?: string;
  watermarkText?: string;
  enableQRCode?: boolean;
  autoBackupFrequency?: string;
  sessionTimeoutMinutes?: number;
  enable2FA?: boolean;
  enableEmailNotifs?: boolean;
  enablePushNotifs?: boolean;
  compactMode?: boolean;
  sidebarStyle?: string;
  fontSize?: string;
}

export type BookCategory = 'علوم وتكنولوجيا' | 'أدب وروايات' | 'تاريخ وجغرافيا' | 'لغات ومراجع' | 'دين وفلسفة' | 'فنون ومهارات';

export type CalendarEventType = 'exam' | 'holiday' | 'activity' | 'meeting' | 'fee_due';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for multi-day events
  startTime?: string; // e.g. "08:00"
  endTime?: string;   // e.g. "10:30"
  location?: string;
  targetAudience?: string; // e.g. "جميع الصفوف", "الصف الثالث الثانوي"
  description?: string;
  organizer?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  relatedPaymentId?: string;
  amount?: number;
}

export interface LibraryBook {
  id: string;          // e.g. "BOOK-101"
  isbn: string;        // e.g. "978-603-00-1234-5"
  title: string;       // e.g. "مبادئ الذكاء الاصطناعي وعلوم البيانات"
  author: string;      // e.g. "د. أحمد الشمراني"
  category: BookCategory;
  copiesTotal: number;
  copiesAvailable: number;
  location: string;    // e.g. "الرف A - القسم العلمي"
  coverUrl?: string;
  description?: string;
  addedDate: string;
}

export type BorrowingStatus = 'borrowed' | 'returned' | 'overdue' | 'lost';

export interface BookBorrowing {
  id: string;          // e.g. "BRW-2001"
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  borrowDate: string;  // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  status: BorrowingStatus;
  notes?: string;
  notified?: boolean;
}

export interface SavedReport {
  id: string; // e.g. "REP-2026-101"
  title: string;
  reportType: string; // e.g. 'executive_annual', 'financial', etc.
  reportTypeLabel: string; // e.g. "التقرير السنوي الشامل"
  generatedBy: string; // User who generated it
  generatedAt: string; // e.g. "2026-07-28 10:30"
  fileFormat: 'PDF' | 'Excel' | 'Printed' | 'Previewed';
  summaryMetrics?: { label: string; value: string | number }[];
  notes?: string;
}

export type DocumentCategory = 'certificates' | 'identity' | 'passport' | 'other';
export type DocumentFileType = 'pdf' | 'word' | 'excel' | 'image';
export type DocumentOwnerType = 'student' | 'teacher';

export interface UserDocument {
  id: string;
  title: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  ownerName: string;
  category: DocumentCategory;
  fileType: DocumentFileType;
  fileName: string;
  fileSize: string; // e.g. "1.4 MB"
  uploadDate: string; // YYYY-MM-DD
  fileUrl?: string; // base64 or preview URL
  notes?: string;
  expiryDate?: string;
  verified?: boolean;
}



