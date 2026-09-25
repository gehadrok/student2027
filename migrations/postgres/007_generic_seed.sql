-- ============================================================================
-- Migration 007: Generic reference seed (PG-4.2)
-- Kayan School ERP — PostgreSQL
-- ----------------------------------------------------------------------------
-- Per PG-4.1 Design A + D6 this seed contains ONLY generic, non-Al-Salam,
-- non-Yemen, non-geographic reference data. The following tables are LEFT
-- EMPTY on purpose (populated per deploying school, never by the product seed):
--   academic_years, academic_terms        (school calendar)
--   subjects_master, sections_master      (curriculum, school-specific)
--   fee_categories, departments           (finance/org, school-specific)
--   buildings, rooms, laboratories, libraries (physical plant, school-specific)
--   school_branches                        (per-school)
--   countries, governorates, districts, cities, nationalities  (D6: geographic)
--
-- Every row is idempotent: INSERT ... ON CONFLICT (id) DO NOTHING, so the
-- migration can be re-applied safely (requirement C).
-- ============================================================================

-- Education Stages (المراحل التعليمية) — universal Arabic structure
INSERT INTO education_stages (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('stage_primary', 'STG-PRI', 'المرحلة الابتدائية', 'Primary Stage', 'المرحلة التعليمية الأولى', 1, 1),
('stage_middle', 'STG-MID', 'المرحلة المتوسطة', 'Middle Stage', 'المرحلة التعليمية المتوسطة', 1, 2),
('stage_secondary', 'STG-SEC', 'المرحلة الثانوية', 'Secondary Stage', 'المرحلة التعليمية الثانوية', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Grade Levels (الصفوف الدراسية)
INSERT INTO grade_levels (id, code, name_ar, name_en, description, education_stage_id, level_number, is_active, display_order) VALUES
('grade_1', 'GRD-01', 'الصف الأول الابتدائي', 'Grade 1', 'الصف الأول', 'stage_primary', 1, 1, 1),
('grade_2', 'GRD-02', 'الصف الثاني الابتدائي', 'Grade 2', 'الصف الثاني', 'stage_primary', 2, 1, 2),
('grade_3', 'GRD-03', 'الصف الثالث الابتدائي', 'Grade 3', 'الصف الثالث', 'stage_primary', 3, 1, 3),
('grade_4', 'GRD-04', 'الصف الرابع الابتدائي', 'Grade 4', 'الصف الرابع', 'stage_primary', 4, 1, 4),
('grade_5', 'GRD-05', 'الصف الخامس الابتدائي', 'Grade 5', 'الصف الخامس', 'stage_primary', 5, 1, 5),
('grade_6', 'GRD-06', 'الصف السادس الابتدائي', 'Grade 6', 'الصف السادس', 'stage_primary', 6, 1, 6),
('grade_7', 'GRD-07', 'الصف الأول المتوسط', 'Grade 7', 'الصف الأول المتوسط', 'stage_middle', 7, 1, 7),
('grade_8', 'GRD-08', 'الصف الثاني المتوسط', 'Grade 8', 'الصف الثاني المتوسط', 'stage_middle', 8, 1, 8),
('grade_9', 'GRD-09', 'الصف الثالث المتوسط', 'Grade 9', 'الصف الثالث المتوسط', 'stage_middle', 9, 1, 9),
('grade_10', 'GRD-10', 'الصف الأول الثانوي', 'Grade 10', 'الصف الأول الثانوي', 'stage_secondary', 10, 1, 10),
('grade_11', 'GRD-11', 'الصف الثاني الثانوي', 'Grade 11', 'الصف الثاني الثانوي', 'stage_secondary', 11, 1, 11),
('grade_12', 'GRD-12', 'الصف الثالث الثانوي', 'Grade 12', 'الصف الثالث الثانوي', 'stage_secondary', 12, 1, 12)
ON CONFLICT (id) DO NOTHING;

-- Exam Types
INSERT INTO exam_types (id, code, name_ar, name_en, description, weight_percent, is_active, display_order) VALUES
('exam_quiz', 'EXM-QUIZ', 'اختبار قصير', 'Quiz', 'اختبار قصير أسبوعي', 10, 1, 1),
('exam_midterm', 'EXM-MID', 'اختبار نصف الفصل', 'Midterm Exam', 'اختبار منتصف الفصل', 30, 1, 2),
('exam_final', 'EXM-FINAL', 'اختبار نهائي', 'Final Exam', 'الاختبار النهائي', 40, 1, 3),
('exam_coursework', 'EXM-CW', 'أعمال الفصل', 'Coursework', 'أعمال ومشاريع الفصل', 15, 1, 4),
('exam_activity', 'EXM-ACT', 'نشاط ومشاركة', 'Activity', 'المشاركة والأنشطة', 5, 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Certificate Types
INSERT INTO certificate_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('cert_transcript', 'CERT-TRAN', 'كشف درجات', 'Transcript', 'كشف درجات شامل', 1, 1),
('cert_graduation', 'CERT-GRAD', 'شهادة تخرج', 'Graduation Certificate', 'شهادة تخرج', 1, 2),
('cert_excellence', 'CERT-EXC', 'شهادة تفوق', 'Excellence Certificate', 'شهادة تفوق أكاديمي', 1, 3),
('cert_behavior', 'CERT-BEH', 'شهادة سلوك', 'Behavior Certificate', 'شهادة حسن السيرة والسلوك', 1, 4)
ON CONFLICT (id) DO NOTHING;

-- Attendance Types
INSERT INTO attendance_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('att_present', 'ATT-PRS', 'حاضر', 'Present', 'الطالب حاضر', 1, 1),
('att_absent', 'ATT-ABS', 'غائب', 'Absent', 'الطالب غائب', 1, 2),
('att_late', 'ATT-LAT', 'متأخر', 'Late', 'الطالب متأخر', 1, 3),
('att_excused', 'ATT-EXC', 'معذور', 'Excused', 'غياب بعذر', 1, 4)
ON CONFLICT (id) DO NOTHING;

-- Leave Types
INSERT INTO leave_types (id, code, name_ar, name_en, description, is_paid, max_days, is_active, display_order) VALUES
('leave_sick', 'LV-SICK', 'إجازة مرضية', 'Sick Leave', 'إجازة بسبب المرض', 1, 30, 1, 1),
('leave_annual', 'LV-ANN', 'إجازة سنوية', 'Annual Leave', 'الإجازة السنوية', 1, 30, 1, 2),
('leave_emergency', 'LV-EMER', 'إجازة طارئة', 'Emergency Leave', 'إجازة للظروف الطارئة', 1, 7, 1, 3),
('leave_maternity', 'LV-MAT', 'إجازة أمومة', 'Maternity Leave', 'إجازة الوضع والأمومة', 1, 90, 1, 4),
('leave_unpaid', 'LV-UNP', 'إجازة بدون راتب', 'Unpaid Leave', 'إجازة بدون راتب', 0, 90, 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Academic Statuses
INSERT INTO academic_statuses (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('status_active', 'ACT-ACTIVE', 'منتظم', 'Active', 'طالب منتظم ومسجل', 1, 1),
('status_at_risk', 'ACT-RISK', 'متوسط الأداء', 'At Risk', 'طالب بحاجة لدعم', 1, 2),
('status_transferred', 'ACT-TRANS', 'منقول', 'Transferred', 'طالب منقول', 1, 3),
('status_graduated', 'ACT-GRAD', 'متخرج', 'Graduated', 'طالب متخرج', 1, 4),
('status_suspended', 'ACT-SUSP', 'موقوف', 'Suspended', 'طالب موقوف', 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Identity Types
INSERT INTO identity_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('id_national', 'ID-NAT', 'بطاقة شخصية', 'National ID', 'بطاقة الهوية الوطنية', 1, 1),
('id_passport', 'ID-PP', 'جواز سفر', 'Passport', 'جواز السفر', 1, 2),
('id_birth', 'ID-BIRTH', 'شهادة ميلاد', 'Birth Certificate', 'شهادة الميلاد', 1, 3),
('id_resident', 'ID-RES', 'إقامة', 'Resident ID', 'بطاقة إقامة', 1, 4)
ON CONFLICT (id) DO NOTHING;

-- Employee Types
INSERT INTO employee_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('emp_teacher', 'EMP-TCH', 'مدرس', 'Teacher', 'كادر تدريسي', 1, 1),
('emp_admin', 'EMP-ADM', 'إداري', 'Administrative', 'موظف إداري', 1, 2),
('emp_support', 'EMP-SUP', 'دعم فني', 'Support Staff', 'طاقم الدعم', 1, 3),
('emp_manager', 'EMP-MGR', 'مدير', 'Manager', 'مدير إدارة أو قسم', 1, 4)
ON CONFLICT (id) DO NOTHING;

-- Qualifications
INSERT INTO qualifications (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('qual_phd', 'Q-PHD', 'دكتوراه', 'PhD', 'درجة الدكتوراه', 1, 1),
('qual_master', 'Q-MASTER', 'ماجستير', 'Master', 'درجة الماجستير', 1, 2),
('qual_bachelor', 'Q-BACH', 'بكالوريوس', 'Bachelor', 'درجة البكالوريوس', 1, 3),
('qual_diploma', 'Q-DIP', 'دبلوم', 'Diploma', 'دبلوم عالي أو متوسط', 1, 4),
('qual_highschool', 'Q-HS', 'ثانوية عامة', 'High School', 'شهادة الثانوية العامة', 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Specializations
INSERT INTO specializations (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('spec_math', 'SP-MATH', 'الرياضيات', 'Mathematics', 'تخصص الرياضيات', 1, 1),
('spec_physics', 'SP-PHY', 'الفيزياء', 'Physics', 'تخصص الفيزياء', 1, 2),
('spec_chemistry', 'SP-CHEM', 'الكيمياء', 'Chemistry', 'تخصص الكيمياء', 1, 3),
('spec_biology', 'SP-BIO', 'الأحياء', 'Biology', 'تخصص الأحياء', 1, 4),
('spec_english', 'SP-ENG', 'اللغة الإنجليزية', 'English', 'تخصص اللغة الإنجليزية', 1, 5),
('spec_arabic', 'SP-ARB', 'اللغة العربية', 'Arabic', 'تخصص اللغة العربية', 1, 6),
('spec_computer', 'SP-CS', 'علوم الحاسب', 'Computer Science', 'تخصص علوم الحاسب', 1, 7)
ON CONFLICT (id) DO NOTHING;

-- Job Titles
INSERT INTO job_titles (id, code, name_ar, name_en, description, employee_type_id, is_active, display_order) VALUES
('job_principal', 'JOB-PRIN', 'مدير المدرسة', 'School Principal', 'مدير المدرسة', 'emp_manager', 1, 1),
('job_vice_principal', 'JOB-VP', 'وكيل المدرسة', 'Vice Principal', 'وكيل المدرسة', 'emp_manager', 1, 2),
('job_head_dept', 'JOB-HD', 'رئيس قسم', 'Head of Department', 'رئيس قسم دراسي', 'emp_manager', 1, 3),
('job_teacher', 'JOB-TCH', 'مدرس', 'Teacher', 'مدرس مادة', 'emp_teacher', 1, 4),
('job_admin', 'JOB-ADM', 'موظف إداري', 'Admin Staff', 'موظف إداري', 'emp_admin', 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Payment Methods
INSERT INTO payment_methods (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('pay_cash', 'PAY-CASH', 'نقداً', 'Cash', 'الدفع نقداً', 1, 1),
('pay_bank', 'PAY-BANK', 'تحويل بنكي', 'Bank Transfer', 'تحويل بنكي', 1, 2),
('pay_card', 'PAY-CARD', 'بطاقة ائتمان', 'Credit Card', 'دفع ببطاقة', 1, 3),
('pay_cheque', 'PAY-CHQ', 'شيك', 'Cheque', 'دفع بشيك', 1, 4)
ON CONFLICT (id) DO NOTHING;

-- Discount Types
INSERT INTO discount_types (id, code, name_ar, name_en, description, discount_percent, is_active, display_order) VALUES
('disc_sibling', 'DISC-SIB', 'خصم الأشقاء', 'Sibling Discount', 'خصم للإخوة', 10, 1, 1),
('disc_staff', 'DISC-STAFF', 'خصم الموظفين', 'Staff Discount', 'خصم لأبناء الموظفين', 25, 1, 2),
('disc_honor', 'DISC-HON', 'خصم المتفوقين', 'Honor Discount', 'خصم للطلاب المتفوقين', 15, 1, 3),
('disc_early', 'DISC-EARLY', 'خصم السداد المبكر', 'Early Payment Discount', 'خصم للسداد المبكر', 5, 1, 4)
ON CONFLICT (id) DO NOTHING;

-- System Numbering
INSERT INTO system_numbering (id, code, name_ar, name_en, description, prefix, next_number, step, pad_length, is_active, display_order) VALUES
('num_student', 'NUM-STU', 'ترقيم الطلاب', 'Student Numbering', 'ترقيم الطلاب الأكاديمي', 'STU-', 1001, 1, 6, 1, 1),
('num_employee', 'NUM-EMP', 'ترقيم الموظفين', 'Employee Numbering', 'ترقيم الموظفين', 'EMP-', 101, 1, 6, 1, 2),
('num_invoice', 'NUM-INV', 'ترقيم الفواتير', 'Invoice Numbering', 'ترقيم الفواتير', 'INV-', 2001, 1, 6, 1, 3),
('num_receipt', 'NUM-REC', 'ترقيم السندات', 'Receipt Numbering', 'ترقيم سندات القبض', 'REC-', 9001, 1, 6, 1, 4),
('num_certificate', 'NUM-CERT', 'ترقيم الشهادات', 'Certificate Numbering', 'ترقيم الشهادات', 'CERT-', 101, 1, 6, 1, 5)
ON CONFLICT (id) DO NOTHING;

-- Document Types
INSERT INTO document_types (id, code, name_ar, name_en, description, is_active, display_order) VALUES
('doc_identity', 'DOC-ID', 'مستندات هوية', 'Identity Documents', 'بطاقات الهوية', 1, 1),
('doc_academic', 'DOC-ACAD', 'مستندات أكاديمية', 'Academic Documents', 'الشهادات والسجلات', 1, 2),
('doc_financial', 'DOC-FIN', 'مستندات مالية', 'Financial Documents', 'الفواتير والسندات', 1, 3),
('doc_medical', 'DOC-MED', 'مستندات طبية', 'Medical Documents', 'التقارير الطبية', 1, 4)
ON CONFLICT (id) DO NOTHING;

-- Currencies (neutral list, NO base currency asserted — is_base = 0 for all)
INSERT INTO currencies (id, code, name_ar, name_en, description, symbol, exchange_rate, is_base, is_active, display_order) VALUES
('cur_yer', 'CUR-YER', 'ريال يمني', 'Yemeni Rial', 'العملة المحلية', 'ر.ي', 1.0, 0, 1, 1),
('cur_sar', 'CUR-SAR', 'ريال سعودي', 'Saudi Riyal', 'الريال السعودي', 'ر.س', 1.0, 0, 1, 2),
('cur_usd', 'CUR-USD', 'دولار أمريكي', 'US Dollar', 'الدولار الأمريكي', '$', 1.0, 0, 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Default Master Data Permissions (generic scaffolding for all 33 entity types)
INSERT INTO master_data_permissions (id, entity_type, can_view, can_create, can_edit, can_delete, can_import, can_export) VALUES
('perm_academic_years', 'academic_years', 1, 1, 1, 1, 1, 1),
('perm_academic_terms', 'academic_terms', 1, 1, 1, 1, 1, 1),
('perm_education_stages', 'education_stages', 1, 1, 1, 1, 1, 1),
('perm_grade_levels', 'grade_levels', 1, 1, 1, 1, 1, 1),
('perm_sections_master', 'sections_master', 1, 1, 1, 1, 1, 1),
('perm_subjects_master', 'subjects_master', 1, 1, 1, 1, 1, 1),
('perm_exam_types', 'exam_types', 1, 1, 1, 1, 1, 1),
('perm_certificate_types', 'certificate_types', 1, 1, 1, 1, 1, 1),
('perm_attendance_types', 'attendance_types', 1, 1, 1, 1, 1, 1),
('perm_leave_types', 'leave_types', 1, 1, 1, 1, 1, 1),
('perm_academic_statuses', 'academic_statuses', 1, 1, 1, 1, 1, 1),
('perm_nationalities', 'nationalities', 1, 1, 1, 1, 1, 1),
('perm_countries', 'countries', 1, 1, 1, 1, 1, 1),
('perm_governorates', 'governorates', 1, 1, 1, 1, 1, 1),
('perm_districts', 'districts', 1, 1, 1, 1, 1, 1),
('perm_cities', 'cities', 1, 1, 1, 1, 1, 1),
('perm_identity_types', 'identity_types', 1, 1, 1, 1, 1, 1),
('perm_employee_types', 'employee_types', 1, 1, 1, 1, 1, 1),
('perm_qualifications', 'qualifications', 1, 1, 1, 1, 1, 1),
('perm_specializations', 'specializations', 1, 1, 1, 1, 1, 1),
('perm_job_titles', 'job_titles', 1, 1, 1, 1, 1, 1),
('perm_departments', 'departments', 1, 1, 1, 1, 1, 1),
('perm_buildings', 'buildings', 1, 1, 1, 1, 1, 1),
('perm_rooms', 'rooms', 1, 1, 1, 1, 1, 1),
('perm_laboratories', 'laboratories', 1, 1, 1, 1, 1, 1),
('perm_libraries', 'libraries', 1, 1, 1, 1, 1, 1),
('perm_fee_categories', 'fee_categories', 1, 1, 1, 1, 1, 1),
('perm_payment_methods', 'payment_methods', 1, 1, 1, 1, 1, 1),
('perm_discount_types', 'discount_types', 1, 1, 1, 1, 1, 1),
('perm_currencies', 'currencies', 1, 1, 1, 1, 1, 1),
('perm_system_numbering', 'system_numbering', 1, 1, 1, 1, 1, 1),
('perm_school_branches', 'school_branches', 1, 1, 1, 1, 1, 1),
('perm_document_types', 'document_types', 1, 1, 1, 1, 1, 1)
ON CONFLICT (id) DO NOTHING;
