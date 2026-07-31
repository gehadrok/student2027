import {
  User, Student, Teacher, Parent, SchoolClass, Section, Subject,
  SchedulePeriod, AttendanceRecord, GradeRecord, Certificate, FeePayment,
  ExpenseRecord, AppNotification, AuditLog, SchoolSettings, LibraryBook,
  BookBorrowing, SavedReport
} from '../types';
import { getSQLiteDB, querySqlSync, runSqlSync, persistSQLiteDB } from './sqlite-engine';

export class SQLiteRepository {

  // ==========================================================================
  // 1. SCHOOL SETTINGS
  // ==========================================================================
  public static getSchoolSettings(): SchoolSettings {
    const defaultSettings: SchoolSettings = {
      schoolName: 'مدرسة خالد ابن الوليد الضالع/جحاف',
      nameEn: 'Khaled Ibn Al-Waleed Secondary School',
      phone: '+967-770001122',
      mobile: '+967-733334455',
      email: 'info@khaled-school.edu.ye',
      address: 'مديرية جحاف - محافظة الضالع - اليمن',
      website: 'https://khaled-school.edu.ye',
      adminName: 'أ. عبد الفتاح الجحافي',
      academicYear: '2025-2026',
      currentTerm: 'الفصل الدراسي الأول',
      logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=200',
      primaryColor: '#1e3a8a',
      enableSMSAlerts: true,
      enableAIAnalysis: true,
      attendanceLockHour: '09:00',
      ministryLicense: 'وزارة التربية والتعليم #48291',
      taxNumber: 'TAX-9028341',
      schoolCode: 'KHS-YEM-2026',
      city: 'مديرية جحاف',
      country: 'الجمهورية اليمنية',
      language: 'ar',
      timeZone: 'Asia/Aden',
      dateFormat: 'DD/MM/YYYY',
      currency: 'YER',
      stampUrl: 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&q=80&w=150',
      principalSignatureUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
      reportHeader: 'الجمهورية اليمنية - وزارة التربية والتعليم - مدرسة خالد ابن الوليد الثانوية',
      reportFooter: 'هذه الوثيقة صادرة إلكترونياً وتعتبر رسمية عند اقترانها بالختم والرمز الرقمي QR',
      passingGradeThreshold: 50,
      gradingSystem: 'percentage',
      invoicePrefix: 'INV-2026-',
      receiptPrefix: 'REC-2026-',
      paperSize: 'A4',
      watermarkText: 'مدرسة خالد بن الوليد - رسمي',
      enableQRCode: true,
      autoBackupFrequency: 'daily',
      sessionTimeoutMinutes: 30,
      enable2FA: false,
      enableEmailNotifs: true,
      enablePushNotifs: true,
      compactMode: false,
      sidebarStyle: 'default',
      fontSize: 'md'
    };

    let baseSettings: SchoolSettings = defaultSettings;

    try {
      const rows = querySqlSync(`
        SELECT school_name, name_en, phone, email, address, website, admin_name,
               academic_year, current_term, logo_url, primary_color,
               enable_sms_alerts, enable_ai_analysis, attendance_lock_hour
        FROM school_settings WHERE id = 1;
      `);
      if (rows.length > 0) {
        const r = rows[0];
        baseSettings = {
          ...defaultSettings,
          schoolName: r.school_name || defaultSettings.schoolName,
          nameEn: r.name_en || defaultSettings.nameEn,
          phone: r.phone || defaultSettings.phone,
          email: r.email || defaultSettings.email,
          address: r.address || defaultSettings.address,
          website: r.website || defaultSettings.website,
          adminName: r.admin_name || defaultSettings.adminName,
          academicYear: r.academic_year || defaultSettings.academicYear,
          currentTerm: r.current_term || defaultSettings.currentTerm,
          logoUrl: r.logo_url || defaultSettings.logoUrl,
          primaryColor: r.primary_color || defaultSettings.primaryColor,
          enableSMSAlerts: Boolean(r.enable_sms_alerts),
          enableAIAnalysis: Boolean(r.enable_ai_analysis),
          attendanceLockHour: r.attendance_lock_hour || defaultSettings.attendanceLockHour
        };
      }
    } catch (err) {
      console.warn('Fallback to default settings on SQLite query:', err);
    }

    try {
      const storedExtended = localStorage.getItem('al_salam_school_extended_settings_v1');
      if (storedExtended) {
        const parsed = JSON.parse(storedExtended);
        return { ...baseSettings, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse extended settings:', e);
    }

    return baseSettings;
  }

  public static updateSchoolSettings(settings: Partial<SchoolSettings>): void {
    const current = this.getSchoolSettings();
    const updated = { ...current, ...settings };

    try {
      runSqlSync(`
        INSERT OR REPLACE INTO school_settings (
          id, school_name, name_en, phone, email, address, website, admin_name,
          academic_year, current_term, logo_url, primary_color,
          enable_sms_alerts, enable_ai_analysis, attendance_lock_hour
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        updated.schoolName, updated.nameEn, updated.phone, updated.email, updated.address,
        updated.website || null, updated.adminName || null, updated.academicYear, updated.currentTerm,
        updated.logoUrl, updated.primaryColor, updated.enableSMSAlerts ? 1 : 0,
        updated.enableAIAnalysis ? 1 : 0, updated.attendanceLockHour
      ]);
    } catch (err) {
      console.warn('SQLite update settings failed:', err);
    }

    try {
      localStorage.setItem('al_salam_school_extended_settings_v1', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save extended settings to localStorage:', e);
    }
  }

  // ==========================================================================
  // 2. USERS
  // ==========================================================================
  public static getUsers(): User[] {
    const rows = querySqlSync(`
      SELECT id, name, role, email, password_hash, phone, photo, avatar_color,
             linked_teacher_id, status, last_login
      FROM users ORDER BY name ASC;
    `);
    
    return rows.map(r => {
      // Get linked student IDs if parent or student
      let linkedStudentIds: string[] = [];
      if (r.role === 'parent' || r.role === 'student') {
        const links = querySqlSync(`SELECT student_id FROM user_linked_students WHERE user_id = ?`, [r.id]);
        linkedStudentIds = links.map(l => l.student_id);
      }
      return {
        id: r.id,
        name: r.name,
        role: r.role,
        email: r.email,
        passwordHash: r.password_hash,
        phone: r.phone,
        photo: r.photo || undefined,
        avatarColor: r.avatar_color || undefined,
        linkedTeacherId: r.linked_teacher_id || undefined,
        linkedStudentIds: linkedStudentIds.length > 0 ? linkedStudentIds : undefined,
        status: r.status,
        lastLogin: r.last_login || undefined
      };
    });
  }

  public static saveUser(user: User): void {
    runSqlSync(`
      INSERT OR REPLACE INTO users (
        id, name, role, email, password_hash, phone, photo, avatar_color,
        linked_teacher_id, status, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      user.id, user.name, user.role, user.email, user.passwordHash || 'hash_default',
      user.phone, user.photo || null, user.avatarColor || null, user.linkedTeacherId || null,
      user.status, user.lastLogin || null
    ]);

    if (user.linkedStudentIds && user.linkedStudentIds.length > 0) {
      runSqlSync(`DELETE FROM user_linked_students WHERE user_id = ?`, [user.id]);
      user.linkedStudentIds.forEach(sid => {
        runSqlSync(`INSERT OR IGNORE INTO user_linked_students (user_id, student_id) VALUES (?, ?)`, [user.id, sid]);
      });
    }
  }

  // ==========================================================================
  // 3. TEACHERS
  // ==========================================================================
  public static getTeachers(): Teacher[] {
    const rows = querySqlSync(`
      SELECT id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status
      FROM teachers ORDER BY name ASC;
    `);

    return rows.map(r => {
      const subRows = querySqlSync(`SELECT subject_id FROM teacher_subjects WHERE teacher_id = ?`, [r.id]);
      const clsRows = querySqlSync(`SELECT class_id FROM teacher_classes WHERE teacher_id = ?`, [r.id]);
      return {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        specialization: r.specialization,
        qualification: r.qualification,
        experienceYears: r.experience_years,
        subjectIds: subRows.map(s => s.subject_id),
        classIds: clsRows.map(c => c.class_id),
        photo: r.photo || undefined,
        status: r.status
      };
    });
  }

  public static saveTeacher(t: Teacher): void {
    runSqlSync(`
      INSERT OR REPLACE INTO teachers (
        id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      t.id, t.userId, t.name, t.email, t.phone, t.specialization, t.qualification,
      t.experienceYears, t.photo || null, t.status
    ]);

    if (t.subjectIds) {
      runSqlSync(`DELETE FROM teacher_subjects WHERE teacher_id = ?`, [t.id]);
      t.subjectIds.forEach(subId => {
        runSqlSync(`INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)`, [t.id, subId]);
      });
    }
    if (t.classIds) {
      runSqlSync(`DELETE FROM teacher_classes WHERE teacher_id = ?`, [t.id]);
      t.classIds.forEach(clsId => {
        runSqlSync(`INSERT OR IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)`, [t.id, clsId]);
      });
    }
  }

  public static deleteTeacher(id: string): void {
    runSqlSync(`DELETE FROM teachers WHERE id = ?`, [id]);
  }

  // ==========================================================================
  // 4. PARENTS
  // ==========================================================================
  public static getParents(): Parent[] {
    const rows = querySqlSync(`
      SELECT id, user_id, name, email, phone, occupation FROM parents ORDER BY name ASC;
    `);

    return rows.map(r => {
      const stuRows = querySqlSync(`SELECT student_id FROM parent_students WHERE parent_id = ?`, [r.id]);
      return {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        occupation: r.occupation || undefined,
        studentIds: stuRows.map(s => s.student_id)
      };
    });
  }

  // ==========================================================================
  // 5. CLASSES & SECTIONS
  // ==========================================================================
  public static getClasses(): SchoolClass[] {
    const classRows = querySqlSync(`
      SELECT id, name, level FROM school_classes ORDER BY level ASC, name ASC;
    `);

    return classRows.map(c => {
      const secRows = querySqlSync(`
        SELECT id, name, class_id, room_number, capacity, supervisor_teacher_id
        FROM sections WHERE class_id = ? ORDER BY name ASC;
      `, [c.id]);

      const sections: Section[] = secRows.map(s => ({
        id: s.id,
        name: s.name,
        classId: s.class_id,
        roomNumber: s.room_number,
        capacity: s.capacity,
        supervisorTeacherId: s.supervisor_teacher_id || undefined
      }));

      return {
        id: c.id,
        name: c.name,
        level: c.level,
        sections
      };
    });
  }

  public static saveClass(c: SchoolClass): void {
    runSqlSync(`
      INSERT OR REPLACE INTO school_classes (id, name, level) VALUES (?, ?, ?);
    `, [c.id, c.name, c.level]);

    if (c.sections) {
      c.sections.forEach(sec => {
        runSqlSync(`
          INSERT OR REPLACE INTO sections (id, name, class_id, room_number, capacity, supervisor_teacher_id)
          VALUES (?, ?, ?, ?, ?, ?);
        `, [sec.id, sec.name, c.id, sec.roomNumber, sec.capacity, sec.supervisorTeacherId || null]);
      });
    }
  }

  // ==========================================================================
  // 6. STUDENTS
  // ==========================================================================
  public static getStudents(): Student[] {
    const rows = querySqlSync(`
      SELECT id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name,
             parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date
      FROM students ORDER BY name ASC;
    `);

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      academicId: r.academic_id,
      name: r.name,
      classId: r.class_id,
      sectionId: r.section_id,
      parentId: r.parent_id,
      parentName: r.parent_name,
      parentPhone: r.parent_phone,
      birthDate: r.birth_date,
      gender: r.gender,
      photo: r.photo || undefined,
      status: r.status,
      healthNotes: r.health_notes || undefined,
      enrollmentDate: r.enrollment_date
    }));
  }

  public static saveStudent(s: Student): void {
    runSqlSync(`
      INSERT OR REPLACE INTO students (
        id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name,
        parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      s.id, s.userId, s.academicId, s.name, s.classId, s.sectionId, s.parentId,
      s.parentName, s.parentPhone, s.birthDate, s.gender, s.photo || null,
      s.status, s.healthNotes || null, s.enrollmentDate
    ]);

    // Also pair in parent_students
    if (s.parentId && s.id) {
      runSqlSync(`INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)`, [s.parentId, s.id]);
    }
  }

  public static deleteStudent(id: string): void {
    runSqlSync(`DELETE FROM students WHERE id = ?`, [id]);
  }

  // ==========================================================================
  // 7. SUBJECTS
  // ==========================================================================
  public static getSubjects(): Subject[] {
    const rows = querySqlSync(`
      SELECT id, name, code, class_id, teacher_id, weekly_hours, max_score, pass_score, color
      FROM subjects ORDER BY name ASC;
    `);

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      classId: r.class_id,
      teacherId: r.teacher_id,
      weeklyHours: r.weekly_hours,
      maxScore: r.max_score,
      passScore: r.pass_score,
      color: r.color || undefined
    }));
  }

  public static saveSubject(s: Subject): void {
    runSqlSync(`
      INSERT OR REPLACE INTO subjects (
        id, name, code, class_id, teacher_id, weekly_hours, max_score, pass_score, color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      s.id, s.name, s.code, s.classId, s.teacherId, s.weeklyHours, s.maxScore, s.passScore, s.color || null
    ]);
  }

  public static deleteSubject(id: string): void {
    runSqlSync(`DELETE FROM subjects WHERE id = ?`, [id]);
  }

  // ==========================================================================
  // 8. TIMETABLE SCHEDULE PERIODS
  // ==========================================================================
  public static getSchedulePeriods(): SchedulePeriod[] {
    const rows = querySqlSync(`
      SELECT id, class_id, section_id, subject_id, teacher_id, day, period_number, start_time, end_time
      FROM schedule_periods ORDER BY day ASC, period_number ASC;
    `);

    return rows.map(r => ({
      id: r.id,
      classId: r.class_id,
      sectionId: r.section_id,
      subjectId: r.subject_id,
      teacherId: r.teacher_id,
      day: r.day,
      periodNumber: r.period_number,
      startTime: r.start_time,
      endTime: r.end_time
    }));
  }

  public static saveSchedulePeriod(sp: SchedulePeriod): void {
    runSqlSync(`
      INSERT OR REPLACE INTO schedule_periods (
        id, class_id, section_id, subject_id, teacher_id, day, period_number, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      sp.id, sp.classId, sp.sectionId, sp.subjectId, sp.teacherId, sp.day,
      sp.periodNumber, sp.startTime, sp.endTime
    ]);
  }

  public static deleteSchedulePeriod(id: string): void {
    runSqlSync(`DELETE FROM schedule_periods WHERE id = ?`, [id]);
  }

  // ==========================================================================
  // 9. ATTENDANCE RECORDS
  // ==========================================================================
  public static getAttendanceRecords(): AttendanceRecord[] {
    const rows = querySqlSync(`
      SELECT id, student_id, class_id, section_id, subject_id, date, status, notes, recorded_by
      FROM attendance_records ORDER BY date DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      classId: r.class_id,
      sectionId: r.section_id,
      subjectId: r.subject_id || undefined,
      date: r.date,
      status: r.status,
      notes: r.notes || undefined,
      recordedBy: r.recorded_by
    }));
  }

  public static saveAttendanceRecord(rec: AttendanceRecord): void {
    runSqlSync(`
      INSERT OR REPLACE INTO attendance_records (
        id, student_id, class_id, section_id, subject_id, date, status, notes, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      rec.id, rec.studentId, rec.classId, rec.sectionId, rec.subjectId || null,
      rec.date, rec.status, rec.notes || null, rec.recordedBy
    ]);
  }

  // ==========================================================================
  // 10. GRADE RECORDS
  // ==========================================================================
  public static getGradeRecords(): GradeRecord[] {
    const rows = querySqlSync(`
      SELECT id, student_id, subject_id, term, type, score, max_score, weight, date, teacher_notes
      FROM grade_records ORDER BY date DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      subjectId: r.subject_id,
      term: r.term,
      type: r.type,
      score: r.score,
      maxScore: r.max_score,
      weight: r.weight,
      date: r.date,
      teacherNotes: r.teacher_notes || undefined
    }));
  }

  public static saveGradeRecord(rec: GradeRecord): void {
    runSqlSync(`
      INSERT OR REPLACE INTO grade_records (
        id, student_id, subject_id, term, type, score, max_score, weight, date, teacher_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      rec.id, rec.studentId, rec.subjectId, rec.term, rec.type, rec.score,
      rec.maxScore, rec.weight, rec.date, rec.teacherNotes || null
    ]);
  }

  public static deleteGradeRecord(id: string): void {
    runSqlSync(`DELETE FROM grade_records WHERE id = ?`, [id]);
  }

  // ==========================================================================
  // 11. ACADEMIC CERTIFICATES
  // ==========================================================================
  public static getCertificates(): Certificate[] {
    const rows = querySqlSync(`
      SELECT id, student_id, term, academic_year, gpa, percentage, grade_label, rank_in_class, generated_date, issued_by
      FROM certificates ORDER BY generated_date DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      term: r.term,
      academicYear: r.academic_year,
      gpa: r.gpa,
      percentage: r.percentage,
      gradeLabel: r.grade_label,
      rankInClass: r.rank_in_class,
      generatedDate: r.generated_date,
      issuedBy: r.issued_by
    }));
  }

  public static saveCertificate(cert: Certificate): void {
    runSqlSync(`
      INSERT OR REPLACE INTO certificates (
        id, student_id, term, academic_year, gpa, percentage, grade_label, rank_in_class, generated_date, issued_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      cert.id, cert.studentId, cert.term, cert.academicYear, cert.gpa, cert.percentage,
      cert.gradeLabel, cert.rankInClass, cert.generatedDate, cert.issuedBy
    ]);
  }

  // ==========================================================================
  // 12. FEE PAYMENTS & TUITION
  // ==========================================================================
  public static getFeePayments(): FeePayment[] {
    const rows = querySqlSync(`
      SELECT id, student_id, receipt_number, title, total_amount, paid_amount, remaining_amount,
             due_date, paid_date, status, payment_method, notes
      FROM fee_payments ORDER BY due_date DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      receiptNumber: r.receipt_number || undefined,
      title: r.title,
      totalAmount: r.total_amount,
      amount: r.total_amount,
      paidAmount: r.paid_amount,
      remainingAmount: r.remaining_amount,
      dueDate: r.due_date,
      paidDate: r.paid_date || undefined,
      status: r.status,
      paymentMethod: r.payment_method || undefined,
      notes: r.notes || undefined
    }));
  }

  public static saveFeePayment(pay: FeePayment): void {
    const total = pay.totalAmount || pay.amount || 0;
    const paid = pay.paidAmount || 0;
    const remaining = total - paid;
    runSqlSync(`
      INSERT OR REPLACE INTO fee_payments (
        id, student_id, receipt_number, title, total_amount, paid_amount, remaining_amount,
        due_date, paid_date, status, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      pay.id, pay.studentId, pay.receiptNumber || null, pay.title, total, paid, remaining,
      pay.dueDate, pay.paidDate || null, pay.status, pay.paymentMethod || null, pay.notes || null
    ]);
  }

  // ==========================================================================
  // 13. EXPENSES
  // ==========================================================================
  public static getExpenses(): ExpenseRecord[] {
    const rows = querySqlSync(`
      SELECT id, voucher_number, category, title, amount, date, beneficiary, approved_by, notes
      FROM expense_records ORDER BY date DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      voucherNumber: r.voucher_number,
      category: r.category,
      title: r.title,
      amount: r.amount,
      date: r.date,
      beneficiary: r.beneficiary,
      approvedBy: r.approved_by,
      notes: r.notes || undefined
    }));
  }

  public static saveExpense(exp: ExpenseRecord): void {
    runSqlSync(`
      INSERT OR REPLACE INTO expense_records (
        id, voucher_number, category, title, amount, date, beneficiary, approved_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      exp.id, exp.voucherNumber, exp.category, exp.title, exp.amount, exp.date,
      exp.beneficiary, exp.approvedBy, exp.notes || null
    ]);
  }

  // ==========================================================================
  // 14. LIBRARY BOOKS
  // ==========================================================================
  public static getLibraryBooks(): LibraryBook[] {
    const rows = querySqlSync(`
      SELECT id, isbn, title, author, category, copies_total, copies_available, location, cover_url, description, added_date
      FROM library_books ORDER BY title ASC;
    `);

    return rows.map(r => ({
      id: r.id,
      isbn: r.isbn,
      title: r.title,
      author: r.author,
      category: r.category,
      copiesTotal: r.copies_total,
      copiesAvailable: r.copies_available,
      location: r.location,
      coverUrl: r.cover_url || undefined,
      description: r.description || undefined,
      addedDate: r.added_date
    }));
  }

  public static saveLibraryBook(bk: LibraryBook): void {
    runSqlSync(`
      INSERT OR REPLACE INTO library_books (
        id, isbn, title, author, category, copies_total, copies_available, location, cover_url, description, added_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      bk.id, bk.isbn, bk.title, bk.author, bk.category, bk.copiesTotal, bk.copiesAvailable,
      bk.location, bk.coverUrl || null, bk.description || null, bk.addedDate
    ]);
  }

  // ==========================================================================
  // 15. BOOK BORROWINGS
  // ==========================================================================
  public static getBookBorrowings(): BookBorrowing[] {
    const rows = querySqlSync(`
      SELECT bb.id, bb.book_id, bb.student_id, bb.borrow_date, bb.due_date, bb.return_date, bb.status, bb.notes, bb.notified,
             lb.title as book_title, st.name as student_name, sc.name as student_class
      FROM book_borrowings bb
      LEFT JOIN library_books lb ON bb.book_id = lb.id
      LEFT JOIN students st ON bb.student_id = st.id
      LEFT JOIN school_classes sc ON st.class_id = sc.id
      ORDER BY bb.borrow_date DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      bookId: r.book_id,
      bookTitle: r.book_title || 'كتاب مجهول',
      studentId: r.student_id,
      studentName: r.student_name || 'طالب مجهول',
      studentClass: r.student_class || undefined,
      borrowDate: r.borrow_date,
      dueDate: r.due_date,
      returnDate: r.return_date || undefined,
      status: r.status,
      notes: r.notes || undefined,
      notified: Boolean(r.notified)
    }));
  }

  public static saveBookBorrowing(brw: BookBorrowing): void {
    runSqlSync(`
      INSERT OR REPLACE INTO book_borrowings (
        id, book_id, student_id, borrow_date, due_date, return_date, status, notes, notified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      brw.id, brw.bookId, brw.studentId, brw.borrowDate, brw.dueDate, brw.returnDate || null,
      brw.status, brw.notes || null, brw.notified ? 1 : 0
    ]);
  }

  // ==========================================================================
  // 16. NOTIFICATIONS
  // ==========================================================================
  public static getNotifications(): AppNotification[] {
    const rows = querySqlSync(`
      SELECT id, user_id, target_role, title, message, type, is_read, created_at, link
      FROM app_notifications ORDER BY created_at DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id || undefined,
      targetRole: r.target_role || undefined,
      title: r.title,
      message: r.message,
      type: r.type,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
      link: r.link || undefined
    }));
  }

  public static saveNotification(notif: AppNotification): void {
    runSqlSync(`
      INSERT OR REPLACE INTO app_notifications (
        id, user_id, target_role, title, message, type, is_read, created_at, link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      notif.id, notif.userId || null, notif.targetRole || null, notif.title,
      notif.message, notif.type, notif.isRead ? 1 : 0, notif.createdAt, notif.link || null
    ]);
  }

  // ==========================================================================
  // 17. AUDIT LOGS
  // ==========================================================================
  public static getAuditLogs(): AuditLog[] {
    const rows = querySqlSync(`
      SELECT id, user_id, user_name, user_role, action, details, timestamp, ip
      FROM audit_logs ORDER BY timestamp DESC LIMIT 100;
    `);

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id || 'system',
      userName: r.user_name,
      userRole: r.user_role,
      action: r.action,
      details: r.details,
      timestamp: r.timestamp,
      ip: r.ip || undefined
    }));
  }

  public static saveAuditLog(log: AuditLog): void {
    runSqlSync(`
      INSERT OR REPLACE INTO audit_logs (id, user_id, user_name, user_role, action, details, timestamp, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      log.id, log.userId || null, log.userName, log.userRole, log.action,
      log.details, log.timestamp, log.ip || null
    ]);
  }

  // ==========================================================================
  // 18. SAVED REPORTS
  // ==========================================================================
  public static getSavedReports(): SavedReport[] {
    const rows = querySqlSync(`
      SELECT id, title, report_type, report_type_label, generated_by, generated_at, file_format, summary_metrics_json, notes
      FROM saved_reports ORDER BY generated_at DESC;
    `);

    return rows.map(r => ({
      id: r.id,
      title: r.title,
      reportType: r.report_type,
      reportTypeLabel: r.report_type_label,
      generatedBy: r.generated_by,
      generatedAt: r.generated_at,
      fileFormat: r.file_format,
      summaryMetrics: r.summary_metrics_json ? JSON.parse(r.summary_metrics_json) : undefined,
      notes: r.notes || undefined
    }));
  }

  public static saveSavedReport(rep: SavedReport): void {
    runSqlSync(`
      INSERT OR REPLACE INTO saved_reports (
        id, title, report_type, report_type_label, generated_by, generated_at, file_format, summary_metrics_json, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      rep.id, rep.title, rep.reportType, rep.reportTypeLabel, rep.generatedBy, rep.generatedAt,
      rep.fileFormat, rep.summaryMetrics ? JSON.stringify(rep.summaryMetrics) : null, rep.notes || null
    ]);
  }

  public static deleteSavedReport(id: string): void {
    runSqlSync(`DELETE FROM saved_reports WHERE id = ?`, [id]);
  }
}
