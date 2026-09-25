import {
  User, Student, Teacher, Parent, SchoolClass, Section, Subject,
  SchedulePeriod, AttendanceRecord, GradeRecord, Certificate,
  FeePayment, ExpenseRecord, AppNotification, AuditLog, SchoolSettings, UserRole,
  LibraryBook, BookBorrowing, SavedReport
} from '../types';
import { SQLiteRepository } from './sqlite-repository';
import { getSQLiteDB, resetSQLiteDBToSeed, querySqlSync } from './sqlite-engine';

const CURRENT_USER_KEY = 'al_salam_school_current_user_v1';

export interface RealmDatabase {
  users: User[];
  students: Student[];
  teachers: Teacher[];
  parents: Parent[];
  classes: SchoolClass[];
  sections: Section[];
  subjects: Subject[];
  schedule: SchedulePeriod[];
  attendance: AttendanceRecord[];
  grades: GradeRecord[];
  certificates: Certificate[];
  payments: FeePayment[];
  expenses: ExpenseRecord[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  settings: SchoolSettings;
  books: LibraryBook[];
  borrowings: BookBorrowing[];
  savedReports: SavedReport[];
}

// Ensure SQLite engine initializes on boot
getSQLiteDB().catch(err => console.error('Failed to auto-init SQLite engine:', err));

// Listener subscription mechanism for reactive UI components
type DBChangeListener = () => void;
const listeners: Set<DBChangeListener> = new Set();

export function subscribeDB(listener: DBChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const subscribeRealmDB = subscribeDB;

export function notifyListeners() {
  listeners.forEach(fn => fn());
}

/**
 * Fetch complete live state directly from SQLite Database
 */
export function getRealmDB(): RealmDatabase {
  try {
    const settings = SQLiteRepository.getSchoolSettings();
    const users = SQLiteRepository.getUsers();
    const teachers = SQLiteRepository.getTeachers();
    const parents = SQLiteRepository.getParents();
    const classes = SQLiteRepository.getClasses();
    const students = SQLiteRepository.getStudents();
    const subjects = SQLiteRepository.getSubjects();
    const schedule = SQLiteRepository.getSchedulePeriods();
    const attendance = SQLiteRepository.getAttendanceRecords();
    const grades = SQLiteRepository.getGradeRecords();
    const certificates = SQLiteRepository.getCertificates();
    const payments = SQLiteRepository.getFeePayments();
    const expenses = SQLiteRepository.getExpenses();
    const books = SQLiteRepository.getLibraryBooks();
    const borrowings = SQLiteRepository.getBookBorrowings();
    const notifications = SQLiteRepository.getNotifications();
    const auditLogs = SQLiteRepository.getAuditLogs();
    const savedReports = SQLiteRepository.getSavedReports();

    // Flatten sections for convenience
    const sections: Section[] = [];
    classes.forEach(c => {
      if (c.sections) {
        c.sections.forEach(s => sections.push(s));
      }
    });

    return {
      settings,
      users,
      teachers,
      parents,
      classes,
      sections,
      students,
      subjects,
      schedule,
      attendance,
      grades,
      certificates,
      payments,
      expenses,
      notifications,
      auditLogs,
      books,
      borrowings,
      savedReports
    };
  } catch (e) {
    console.error('Error reading from SQLite Database:', e);
    // Fallback empty structure
    return {
      settings: SQLiteRepository.getSchoolSettings(),
      users: [],
      teachers: [],
      parents: [],
      classes: [],
      sections: [],
      students: [],
      subjects: [],
      schedule: [],
      attendance: [],
      grades: [],
      certificates: [],
      payments: [],
      expenses: [],
      notifications: [],
      auditLogs: [],
      books: [],
      borrowings: [],
      savedReports: []
    };
  }
}

/**
 * Read the ids currently stored in a table
 */
function storedRowIds(table: string): string[] {
  return querySqlSync<{ id: string }>(`SELECT id FROM ${table}`).map((row) => row.id);
}

/**
 * Remove rows that no longer exist in the incoming snapshot.
 * Every caller passes a full `getRealmDB()` snapshot, so a row that is absent
 * from the snapshot is a row the user deleted and it must not come back.
 */
function removeRowsMissingFrom(
  table: string,
  incoming: Array<{ id: string }> | undefined,
  remove: (id: string) => void
) {
  if (!incoming) return;
  const kept = new Set(incoming.map((row) => row.id));
  for (const id of storedRowIds(table)) {
    if (!kept.has(id)) remove(id);
  }
}

/**
 * Persist removals for the entities that expose a repository delete API.
 * Only tables with an existing delete method are reconciled, so no new
 * destructive behaviour is introduced for tables the UI never deletes.
 */
function persistRemovedRows(data: RealmDatabase) {
  const removals: Array<{
    table: string;
    rows: Array<{ id: string }> | undefined;
    remove: (id: string) => void;
  }> = [
    { table: 'students', rows: data.students, remove: (id) => SQLiteRepository.deleteStudent(id) },
    { table: 'teachers', rows: data.teachers, remove: (id) => SQLiteRepository.deleteTeacher(id) },
    { table: 'subjects', rows: data.subjects, remove: (id) => SQLiteRepository.deleteSubject(id) },
    { table: 'schedule_periods', rows: data.schedule, remove: (id) => SQLiteRepository.deleteSchedulePeriod(id) },
    { table: 'grade_records', rows: data.grades, remove: (id) => SQLiteRepository.deleteGradeRecord(id) },
    { table: 'saved_reports', rows: data.savedReports, remove: (id) => SQLiteRepository.deleteSavedReport(id) },
  ];

  for (const { table, rows, remove } of removals) {
    try {
      removeRowsMissingFrom(table, rows, remove);
    } catch (e) {
      console.error(`Failed to persist removals for ${table}:`, e);
    }
  }
}

/**
 * Persist incoming database mutations directly to SQLite
 */
export function saveRealmDB(data: RealmDatabase, notify = true) {
  try {
    if (data.settings) SQLiteRepository.updateSchoolSettings(data.settings);
    if (data.users) data.users.forEach(u => SQLiteRepository.saveUser(u));
    if (data.teachers) data.teachers.forEach(t => SQLiteRepository.saveTeacher(t));
    if (data.classes) data.classes.forEach(c => SQLiteRepository.saveClass(c));
    if (data.students) data.students.forEach(s => SQLiteRepository.saveStudent(s));
    if (data.subjects) data.subjects.forEach(sub => SQLiteRepository.saveSubject(sub));
    if (data.schedule) data.schedule.forEach(sc => SQLiteRepository.saveSchedulePeriod(sc));
    if (data.attendance) data.attendance.forEach(att => SQLiteRepository.saveAttendanceRecord(att));
    if (data.grades) data.grades.forEach(g => SQLiteRepository.saveGradeRecord(g));
    if (data.certificates) data.certificates.forEach(c => SQLiteRepository.saveCertificate(c));
    if (data.payments) data.payments.forEach(p => SQLiteRepository.saveFeePayment(p));
    if (data.expenses) data.expenses.forEach(e => SQLiteRepository.saveExpense(e));
    if (data.books) data.books.forEach(bk => SQLiteRepository.saveLibraryBook(bk));
    if (data.borrowings) data.borrowings.forEach(brw => SQLiteRepository.saveBookBorrowing(brw));
    if (data.notifications) data.notifications.forEach(n => SQLiteRepository.saveNotification(n));
    if (data.auditLogs) data.auditLogs.forEach(a => SQLiteRepository.saveAuditLog(a));
    if (data.savedReports) data.savedReports.forEach(sr => SQLiteRepository.saveSavedReport(sr));

    persistRemovedRows(data);

    if (notify) notifyListeners();
  } catch (e) {
    console.error('Failed to save to SQLite Database:', e);
  }
}

/**
 * Reset database back to SQLite seed state
 */
export async function resetRealmDB() {
  await resetSQLiteDBToSeed();
  addAuditLog('إعادة ضبط قاعدة البيانات SQLite', 'تم استعادة كافة البيانات النموذجية الافتراضية والجدول 3NF بالكامل');
  notifyListeners();
  return getRealmDB();
}

/**
 * Get active logged-in user
 */
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) {
      const users = SQLiteRepository.getUsers();
      return users.length > 0 ? users[0] : null;
    }
    return JSON.parse(raw);
  } catch (e) {
    const users = SQLiteRepository.getUsers();
    return users.length > 0 ? users[0] : null;
  }
}

export function setCurrentUser(user: User | null) {
  try {
    if (user) {
      // SECURITY (PG-6 / D4): never persist credential material to the browser.
      // Strip password_hash / passwordHash before writing to localStorage.
      const safe: Record<string, any> = { ...(user as any) };
      delete safe.passwordHash;
      delete safe.password_hash;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safe));
      addAuditLog("تسجيل دخول", `تم تسجيل الدخول بدور (${user.role}) - ${user.name}`);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    notifyListeners();
  } catch (e) {
    console.error("Failed to set current user", e);
  }
}

/**
 * Record an audit log entry directly into SQLite audit_logs table
 */
export function addAuditLog(action: string, details: string) {
  const user = getCurrentUser();
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user?.id || 'sys',
    userName: user?.name || 'مدير النظام',
    userRole: user?.role || 'admin',
    action,
    details,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
  };

  SQLiteRepository.saveAuditLog(newLog);
  notifyListeners();
}

/**
 * Add saved report log entry directly into SQLite saved_reports table
 */
export function addSavedReportLog(report: Omit<SavedReport, 'id' | 'generatedAt' | 'generatedBy'> & { id?: string; generatedAt?: string; generatedBy?: string }) {
  const user = getCurrentUser();
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newReport: SavedReport = {
    id: report.id || `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    title: report.title,
    reportType: report.reportType,
    reportTypeLabel: report.reportTypeLabel || report.title,
    generatedBy: report.generatedBy || (user ? user.name : 'مدير النظام'),
    generatedAt: report.generatedAt || nowStr,
    fileFormat: report.fileFormat || 'PDF',
    summaryMetrics: report.summaryMetrics || [],
    notes: report.notes || 'تم الحفظ والتوثيق الآلي في قاعدة البيانات SQLite'
  };

  SQLiteRepository.saveSavedReport(newReport);
  addAuditLog("حفظ تقرير SQLite", `تم إنشاء وحفظ تقرير (${newReport.title}) بصيغة (${newReport.fileFormat})`);
  notifyListeners();
  return newReport;
}

export function deleteSavedReportLog(id: string) {
  SQLiteRepository.deleteSavedReport(id);
  addAuditLog("حذف تقرير من السجل", `تم حذف التقرير برقم (${id}) من قاعدة البيانات SQLite`);
  notifyListeners();
}

export function getSavedReportsLog(): SavedReport[] {
  return SQLiteRepository.getSavedReports();
}
