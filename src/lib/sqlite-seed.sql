-- ============================================================================
-- Al-Salam School Management System (مدرسة خالد ابن الوليد الضالع/جحاف)
-- Production Seed Data Script
-- ============================================================================

-- 1. SCHOOL SETTINGS
INSERT OR REPLACE INTO school_settings (
    id, school_name, name_en, phone, email, address, website, admin_name, academic_year, current_term, logo_url, primary_color, enable_sms_alerts, enable_ai_analysis, attendance_lock_hour
) VALUES (
    1,
    'مدرسة خالد ابن الوليد الضالع/جحاف',
    'Khaled Ibn Al-Waleed Secondary School - Jahaf/Dhale',
    '+967-770001122',
    'info@khaled-school.edu.ye',
    'مديرية جحاف - محافظة الضالع - الجمهورية اليمنية',
    'https://khaled-school.edu.ye',
    'إدارة مدرسة خالد ابن الوليد',
    '2025-2026',
    'الفصل الأول',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=200',
    '#1e3a8a',
    1,
    1,
    '09:00'
);

-- 2. USERS (Admin, Teachers, Parents, Students)
INSERT OR IGNORE INTO users (id, name, role, email, password_hash, phone, photo, avatar_color, linked_teacher_id, status, last_login) VALUES
('u1', 'أ. عبدالله الغامدي', 'admin', 'admin@khaled.edu.ye', 'hash_admin123', '0501112233', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '#1e3a8a', NULL, 'active', '2026-07-28 10:15'),
('u2', 'أ. محمد سعيد الزهراني', 'teacher', 'm.zahrani@khaled.edu.ye', 'hash_teacher1', '0502223344', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '#047857', 't1', 'active', '2026-07-28 09:30'),
('u3', 'أ. سارة أحمد القحطاني', 'teacher', 's.qahtani@khaled.edu.ye', 'hash_teacher2', '0503334455', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', '#b45309', 't2', 'active', '2026-07-27 14:20'),
('u4', 'أ. خالد العتيبي', 'teacher', 'k.otaibi@khaled.edu.ye', 'hash_teacher3', '0504445566', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '#4338ca', 't3', 'active', '2026-07-28 08:45'),
('u5', 'أ. فاطمة الشهري', 'teacher', 'f.shehri@khaled.edu.ye', 'hash_teacher4', '0505556677', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', '#0d9488', 't4', 'active', '2026-07-26 11:00'),
('u6', 'د. إبراهيم علي العسيري', 'parent', 'i.asiri@gmail.com', 'hash_parent1', '0506667788', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '#6366f1', NULL, 'active', '2026-07-28 11:10'),
('u7', 'م. صالح الدوسري', 'parent', 's.dosari@gmail.com', 'hash_parent2', '0507778899', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', '#8b5cf6', NULL, 'active', '2026-07-27 18:30'),
('u8', 'عمر إبراهيم العسيري', 'student', 'omar.asiri@student.khaled.edu.ye', 'hash_student1', '0508889900', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', '#2563eb', NULL, 'active', '2026-07-28 07:50'),
('u9', 'سارة صالح الدوسري', 'student', 'sara.dosari@student.khaled.edu.ye', 'hash_student2', '0509990011', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '#ec4899', NULL, 'active', '2026-07-27 16:15'),
('u10', 'يوسف إبراهيم العسيري', 'student', 'youssef.asiri@student.khaled.edu.ye', 'hash_student3', '0500001122', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '#10b981', NULL, 'active', '2026-07-28 08:00');

-- 3. TEACHERS
INSERT OR IGNORE INTO teachers (id, user_id, name, email, phone, specialization, qualification, experience_years, photo, status) VALUES
('t1', 'u2', 'أ. محمد سعيد الزهراني', 'm.zahrani@khaled.edu.ye', '0502223344', 'الرياضيات والفيزياء', 'ماجستير مناهج رياضيات', 12, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'active'),
('t2', 'u3', 'أ. سارة أحمد القحطاني', 's.qahtani@khaled.edu.ye', '0503334455', 'اللغة الإنجليزية والترجمة', 'بكالوريوس أساليب تدريس', 8, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'active'),
('t3', 'u4', 'أ. خالد العتيبي', 'k.otaibi@khaled.edu.ye', '0504445566', 'العلوم والكمياء', 'بكالوريوس كيمياء عامة', 10, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'active'),
('t4', 'u5', 'أ. فاطمة الشهري', 'f.shehri@khaled.edu.ye', '0505556677', 'الحاسب الآلي والتقنية', 'بكالوريوس علوم حاسب', 6, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'active');

-- 4. PARENTS
INSERT OR IGNORE INTO parents (id, user_id, name, email, phone, occupation) VALUES
('p1', 'u6', 'د. إبراهيم علي العسيري', 'i.asiri@gmail.com', '0506667788', 'طبيب استشاري'),
('p2', 'u7', 'م. صالح الدوسري', 's.dosari@gmail.com', '0507778899', 'مهندس معماري');

-- 5. SCHOOL CLASSES
INSERT OR IGNORE INTO school_classes (id, name, level) VALUES
('c1', 'الصف الأول الثانوي', 10),
('c2', 'الصف الثاني الثانوي', 11),
('c3', 'الصف الثالث الثانوي', 12);

-- 6. SECTIONS
INSERT OR IGNORE INTO sections (id, name, class_id, room_number, capacity, supervisor_teacher_id) VALUES
('sec1', 'شعبة (أ)', 'c1', 'قاعة 101', 30, 't1'),
('sec2', 'شعبة (ب)', 'c1', 'قاعة 102', 28, 't2'),
('sec3', 'شعبة (أ)', 'c2', 'قاعة 201', 32, 't3'),
('sec4', 'شعبة (أ)', 'c3', 'قاعة 301', 25, 't4');

-- 7. STUDENTS
INSERT OR IGNORE INTO students (id, user_id, academic_id, name, class_id, section_id, parent_id, parent_name, parent_phone, birth_date, gender, photo, status, health_notes, enrollment_date) VALUES
('s1', 'u8', 'STU-2026-001', 'عمر إبراهيم العسيري', 'c1', 'sec1', 'p1', 'د. إبراهيم علي العسيري', '0506667788', '2010-04-12', 'male', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'active', 'حساسية خفيفة من غبار العشب', '2024-09-01'),
('s2', 'u9', 'STU-2026-002', 'سارة صالح الدوسري', 'c1', 'sec1', 'p2', 'م. صالح الدوسري', '0507778899', '2010-08-25', 'female', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'active', 'لا توجد ملاحظات صحية', '2024-09-01'),
('s3', 'u10', 'STU-2026-003', 'يوسف إبراهيم العسيري', 'c2', 'sec3', 'p1', 'د. إبراهيم علي العسيري', '0506667788', '2009-02-18', 'male', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'active', 'يرتدي نظارة طبية أثناء القراءة', '2023-09-01');

-- 8. SUBJECTS
INSERT OR IGNORE INTO subjects (id, name, code, class_id, teacher_id, weekly_hours, max_score, pass_score, color) VALUES
('sub1', 'الرياضيات العامة', 'MATH101', 'c1', 't1', 5, 100.0, 50.0, '#2563eb'),
('sub2', 'اللغة الإنجليزية', 'ENG101', 'c1', 't2', 4, 100.0, 50.0, '#b45309'),
('sub3', 'الكيمياء العامة', 'CHEM101', 'c1', 't3', 3, 100.0, 50.0, '#047857'),
('sub4', 'الحاسب الآلي والذكاء الاصطناعي', 'CS101', 'c1', 't4', 3, 100.0, 50.0, '#0d9488'),
('sub5', 'الفيزياء المتقدمة', 'PHYS201', 'c2', 't1', 5, 100.0, 50.0, '#4338ca');

-- 9. SCHEDULE PERIODS
INSERT OR IGNORE INTO schedule_periods (id, class_id, section_id, subject_id, teacher_id, day, period_number, start_time, end_time) VALUES
('sch1', 'c1', 'sec1', 'sub1', 't1', 'الأحد', 1, '07:30', '08:15'),
('sch2', 'c1', 'sec1', 'sub2', 't2', 'الأحد', 2, '08:15', '09:00'),
('sch3', 'c1', 'sec1', 'sub3', 't3', 'الأحد', 3, '09:15', '10:00'),
('sch4', 'c1', 'sec1', 'sub4', 't4', 'الإثنين', 1, '07:30', '08:15'),
('sch5', 'c1', 'sec1', 'sub1', 't1', 'الإثنين', 2, '08:15', '09:00'),
('sch6', 'c1', 'sec1', 'sub2', 't2', 'الثلاثاء', 1, '07:30', '08:15'),
('sch7', 'c1', 'sec1', 'sub3', 't3', 'الأربعاء', 1, '07:30', '08:15'),
('sch8', 'c1', 'sec1', 'sub4', 't4', 'الخميس', 1, '07:30', '08:15');

-- 10. ATTENDANCE RECORDS
INSERT OR IGNORE INTO attendance_records (id, student_id, class_id, section_id, subject_id, date, status, notes, recorded_by) VALUES
('att1', 's1', 'c1', 'sec1', 'sub1', '2026-07-28', 'present', 'حضور تام وتفاعل ممتاز', 'أ. محمد سعيد الزهراني'),
('att2', 's2', 'c1', 'sec1', 'sub1', '2026-07-28', 'present', 'حضور مبكر', 'أ. محمد سعيد الزهراني'),
('att3', 's3', 'c2', 'sec3', 'sub5', '2026-07-28', 'late', 'تأخر 10 دقائق بعذر طبي', 'أ. محمد سعيد الزهراني'),
('att4', 's1', 'c1', 'sec1', 'sub2', '2026-07-27', 'present', 'حضور منتظم', 'أ. سارة أحمد القحطاني'),
('att5', 's2', 'c1', 'sec1', 'sub2', '2026-07-27', 'excused', 'عذر مسبق من ولي الأمر', 'أ. سارة أحمد القحطاني');

-- 11. GRADE RECORDS
INSERT OR IGNORE INTO grade_records (id, student_id, subject_id, term, type, score, max_score, weight, date, teacher_notes) VALUES
('gr1', 's1', 'sub1', 'الفصل الأول', 'midterm', 95.0, 100.0, 30.0, '2026-05-10', 'ممتاز جداً في الجبر والهندسة'),
('gr2', 's1', 'sub2', 'الفصل الأول', 'midterm', 92.0, 100.0, 30.0, '2026-05-12', 'مهارة قراءة وكتابة متميزة'),
('gr3', 's1', 'sub3', 'الفصل الأول', 'midterm', 88.0, 100.0, 30.0, '2026-05-15', 'أداء جيد في الاختبار العملي'),
('gr4', 's2', 'sub1', 'الفصل الأول', 'midterm', 98.0, 100.0, 30.0, '2026-05-10', 'الأولى على الفصل في الاختبار النصفي'),
('gr5', 's2', 'sub2', 'الفصل الأول', 'midterm', 96.0, 100.0, 30.0, '2026-05-12', 'طلاقة ممتازة في الحديث'),
('gr6', 's3', 'sub5', 'الفصل الأول', 'midterm', 85.0, 100.0, 30.0, '2026-05-11', 'أداء متوازن في الفيزياء');

-- 12. ACADEMIC CERTIFICATES
INSERT OR IGNORE INTO certificates (id, student_id, term, academic_year, gpa, percentage, grade_label, rank_in_class, generated_date, issued_by) VALUES
('cert1', 's1', 'الفصل الأول', '2025-2026', 92.5, 92.5, 'ممتاز', 2, '2026-06-01', 'إدارة مدرسة خالد ابن الوليد الضالع/جحاف'),
('cert2', 's2', 'الفصل الأول', '2025-2026', 97.0, 97.0, 'ممتاز', 1, '2026-06-01', 'إدارة مدرسة خالد ابن الوليد الضالع/جحاف');

-- 13. FEE PAYMENTS & TUITION
INSERT OR IGNORE INTO fee_payments (id, student_id, receipt_number, title, total_amount, paid_amount, remaining_amount, due_date, paid_date, status, payment_method, notes) VALUES
('pay1', 's1', 'REC-9001', 'القسط الأول - الرسوم الدراسية والكتب', 150000.0, 150000.0, 0.0, '2025-10-01', '2025-09-25', 'paid', 'تحويل بنكي - النجم', 'سداد كامل القسط الأول'),
('pay2', 's1', 'REC-9002', 'القسط الثاني - الرسوم الدراسية', 150000.0, 100000.0, 50000.0, '2026-02-01', '2026-01-20', 'partial', 'سند قبض نقدي', 'تم دفع 100,000 ر.ي والمتبقي 50,000 ر.ي'),
('pay3', 's2', 'REC-9003', 'الرسوم السنوية الشاملة', 300000.0, 300000.0, 0.0, '2025-10-01', '2025-09-20', 'paid', 'سداد إلكتروني - الكريمي', 'خصم التفوق 10% مطبق'),
('pay4', 's3', 'REC-9004', 'القسط الأول - الرسوم الدراسية', 150000.0, 150000.0, 0.0, '2025-10-01', '2025-09-28', 'paid', 'تحويل بنكي', 'سداد مكتمل');

-- 14. EXPENSE RECORDS
INSERT OR IGNORE INTO expense_records (id, voucher_number, category, title, amount, date, beneficiary, approved_by, notes) VALUES
('exp1', 'EXP-4001', 'صيانة ومرافق', 'صيانة معامل الحاسب الآلي وشبكة الإنترنت', 250000.0, '2026-07-15', 'مؤسسة التقنية للتجهيزات', 'أ. عبدالله الغامدي', 'تحديث الأجهزة وتزويد المعمل بالقطع الحديثة'),
('exp2', 'EXP-4002', 'رواتب مكافآت', 'مكافآت التميز الأكاديمي للكادر التدريسي', 500000.0, '2026-07-01', 'حسابات معملي ومدرسي المدرسة', 'أ. عبدالله الغامدي', 'صرف مستحقات الشهر السادس مع المكافآت');

-- 15. LIBRARY BOOKS
INSERT OR IGNORE INTO library_books (id, isbn, title, author, category, copies_total, copies_available, location, cover_url, description, added_date) VALUES
('bk1', '978-603-00-1234-5', 'مبادئ الذكاء الاصطناعي وعلوم البيانات', 'د. أحمد الشمراني', 'علوم وتكنولوجيا', 10, 8, 'الرف A - القسم العلمي', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300', 'دليل مبسط وشامل لأساسيات تعلم الآلة والذكاء الاصطناعي لطلاب المدارس', '2025-09-10'),
('bk2', '978-603-00-5678-9', 'تاريخ الفكر العلمي والحضاري', 'د. محمود شاكر', 'تاريخ وجغرافيا', 8, 8, 'الرف B - قسم التاريخ', 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300', 'نظرة تاريخية تحليلية لتطور الفكر الإنساني والاكتشافات العلمية', '2025-09-12'),
('bk3', '978-603-00-9999-0', 'ديوان المتنبي - شرح وتبريد', 'أبو الطيب المتنبي', 'أدب وروايات', 12, 11, 'الرف C - الأدب العربي', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300', 'الأعمال الشعرية الكاملة للمتنبي مع الشرح والمفردات', '2025-09-15');

-- 16. BOOK BORROWINGS
INSERT OR IGNORE INTO book_borrowings (id, book_id, student_id, borrow_date, due_date, return_date, status, notes, notified) VALUES
('brw1', 'bk1', 's1', '2026-07-20', '2026-08-03', NULL, 'borrowed', 'استعارة لمشروع الحاسب الآلي', 0),
('brw2', 'bk3', 's2', '2026-07-10', '2026-07-24', '2026-07-22', 'returned', 'تم الإرجاع بحالة ممتازة قبل الموعد المحدد', 0);

-- 17. APP NOTIFICATIONS
INSERT OR IGNORE INTO app_notifications (id, user_id, target_role, title, message, type, is_read, created_at, link) VALUES
('notif1', NULL, 'student', 'مواعيد امتحانات الفصل الأول', 'تعلن إدارة المدرسة عن جدول الامتحانات النهائية المعتمد على المنصة.', 'info', 0, '2026-07-28 08:00', '/timetable'),
('notif2', 'u8', NULL, 'تذكير باستعارة كتاب المكتبة', 'يرجى العلم أن كتاب (مبادئ الذكاء الاصطناعي) يستحق الإرجاع بتاريخ 2026-08-03.', 'warning', 0, '2026-07-28 09:30', '/library'),
('notif3', 'u6', NULL, 'سداد قسط دراسي نجاح', 'نشكركم على سداد القسط الأول لنجلكم عمر إبراهيم العسيري.', 'success', 1, '2026-07-20 12:00', '/financial');

-- 18. AUDIT LOGS
INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, user_role, action, details, timestamp, ip) VALUES
('log1', 'u1', 'أ. عبدالله الغامدي', 'admin', 'تهيئة قاعدة البيانات SQLite', 'تم إنشاء وتفعيل الهيكل الشامل وقاعدة البيانات الإنتاجية 3NF بنجاح', '2026-07-28 14:30', '127.0.0.1'),
('log2', 'u2', 'أ. محمد سعيد الزهراني', 'teacher', 'رصد درجات اختبار', 'تم إدخال ورصد نتائج اختبار مادة الرياضيات للفصل الأول', '2026-07-28 10:00', '192.168.1.15');

-- 19. SAVED REPORTS LOG
INSERT OR IGNORE INTO saved_reports (id, title, report_type, report_type_label, generated_by, generated_at, file_format, summary_metrics_json, notes) VALUES
('REP-2026-101', 'التقرير السنوي الشامل 2025/2026', 'executive_annual', 'التقرير السنوي الشامل', 'أ. عبدالله الغامدي', '2026-07-28 08:30', 'PDF', '[{"label":"إجمالي الطلاب","value":1245},{"label":"نسبة الحضور","value":"97%"},{"label":"نسبة التحصيل المالي","value":"86%"}]', 'تم تصدير نسخة رسمية معتمدة للتوجيه والإدارة العامة'),
('REP-2026-102', 'تقرير التحصيل المالي والرسوم المتبقية', 'financial', 'التقرير المالي والرسوم', 'أ. عبدالله الغامدي', '2026-07-27 11:15', 'Excel', '[{"label":"المبلغ المحصل","value":"74,800,000 ر.ي"},{"label":"المتبقي","value":"11,700,000 ر.ي"}]', 'تصدير كشف الأقساط المتأخرة للتحصيل');

-- 20. JUNCTION TABLES ASSOCIATIONS
INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES
('t1', 'sub1'), ('t1', 'sub5'),
('t2', 'sub2'),
('t3', 'sub3'),
('t4', 'sub4');

INSERT OR IGNORE INTO teacher_classes (teacher_id, class_id) VALUES
('t1', 'c1'), ('t1', 'c2'),
('t2', 'c1'),
('t3', 'c1'),
('t4', 'c1');

INSERT OR IGNORE INTO parent_students (parent_id, student_id) VALUES
('p1', 's1'),
('p1', 's3'),
('p2', 's2');

INSERT OR IGNORE INTO user_linked_students (user_id, student_id) VALUES
('u6', 's1'),
('u6', 's3'),
('u7', 's2'),
('u8', 's1'),
('u9', 's2'),
('u10', 's3');

