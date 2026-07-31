# 04 - قائمة المهام التنفيذية (Tasks)
## نظام إدارة مدرسة السلام

**قواعد التنفيذ:**
- نفّذ المهام **بالترتيب** (T001 ثم T002 ...). كل مهمة تفترض اكتمال ما قبلها.
- قبل البدء بأي مهمة: اقرأ `00-constitution.md` + القسم المرتبط في `02-plan.md` + القالب المرتبط في `03-code-patterns.md`.
- كل مهمة تذكر: **الهدف / الملفات / المتطلبات الدقيقة / معيار القبول**.
- عمود "🤖 النموذج المقترح": `رخيص` = نمط متكرر واضح، `متوسط` = يتطلب منطقًا أو قرارات تصميمية.

---

## Phase 0 — الأساس (Foundation)

### T001 — هيكل المجلدات والملفات الفارغة
**🤖 رخيص**
**الهدف:** إنشاء كل المجلدات والملفات الفارغة المذكورة في `02-plan.md` القسم 2 (بدون محتوى فعلي، فقط تعليق `// TODO` في كل ملف JS وCSS).
**معيار القبول:** الهيكل مطابق 100% لما في `02-plan.md`.

### T002 — variables.css
**🤖 رخيص**
**الملفات:** `styles/variables.css`
**المتطلبات:** انسخ متغيرات الألوان والخطوط بالضبط من `00-constitution.md` القسم 1 (البند 6 و7)، أضف أيضًا `--color-warning-orange: #F59E0B;` ومتغيرات مسافات (`--spacing-sm: 8px; --spacing-md: 16px; --spacing-lg: 24px;`) وزوايا دوران (`--radius: 8px;`).
**معيار القبول:** كل الألوان معرّفة كمتغيرات CSS فقط، لا Hex مباشر خارج هذا الملف.

### T003 — base.css و layout.css
**🤖 رخيص**
**المتطلبات:**
- `base.css`: إعادة تعيين (Reset) + `body { font-family: 'Tajawal', sans-serif; direction: rtl; background: var(--color-bg); }`
- `layout.css`: `.app-layout { display: flex; }`, `.main-content { flex: 1; padding: var(--spacing-lg); }`, تصميم Responsive بـ `@media (max-width: 768px)` يحول `.app-layout` إلى عمودي ويخفي القائمة الجانبية افتراضيًا.

### T004 — مكوّنات CSS (navbar, sidebar, table, modal, form, card, notifications)
**🤖 رخيص**
**المتطلبات:** لكل ملف في `styles/components/`، صمم عناصره باستخدام متغيرات `variables.css` فقط. الشريط العلوي (navbar) خلفيته `--color-primary-blue` ونص أبيض. أزرار الحفظ/الإضافة تستخدم `--color-primary-blue`، أزرار الحذف/الخطر تستخدم `--color-danger-red`، رسائل النجاح تستخدم `--color-success-green`.
**معيار القبول:** فتح أي صفحة تجريبية يظهر تصميمًا متسقًا بلا تكسّر.

### T005 — schemas.js
**🤖 رخيص**
**الملفات:** `scripts/db/schemas.js`
**المتطلبات:** انسخ كائن `SCHEMAS` بالضبط كما هو في `02-plan.md` القسم 3، دون أي تعديل في أسماء الحقول.

### T006 — local-store.js (طبقة قاعدة البيانات)
**🤖 متوسط**
**الملفات:** `scripts/db/local-store.js`
**المتطلبات:** نفّذ الدوال الست المذكورة في `02-plan.md` القسم 4 باستخدام IndexedDB الأصلي في المتصفح (بدون مكتبات). `initDB()` تُنشئ object store لكل مفتاح في `SCHEMAS` باستخدام `id` كمفتاح أساسي (`keyPath: "id"`). استخدم `crypto.randomUUID()` لتوليد `id`.
**معيار القبول:** استدعاء `create("Student", {...})` من Console يضيف سجلًا فعليًا يمكن استرجاعه بـ `find("Student")`.

### T007 — seed-data.js (بيانات تجريبية)
**🤖 رخيص**
**الملفات:** `scripts/shared/seed-data.js`
**المتطلبات:** دالة `seedInitialData()` تُنشئ عند أول تشغيل (تحقق من عدم وجود بيانات مسبقًا):
- مستخدم مدير: `admin@alsalam.edu / Admin@123`
- 2 فصلين دراسيين، 2 مادتين، مدرس واحد، 3 طلاب مع أولياء أمورهم.
**معيار القبول:** بعد أول فتح للتطبيق، يمكن تسجيل الدخول بحساب المدير التجريبي مباشرة.

### T008 — utils.js و validators.js
**🤖 رخيص**
**المتطلبات في `utils.js`:** `formatDate(date)`, `formatCurrency(amount)`, `getGradeLabel(score)` (تُستخدم أيضًا من `grade-service.js`), `generateAcademicNumber()`.
**المتطلبات في `validators.js`:** `isValidEmail(email)`, `isRequired(value)`, `isInRange(value, min, max)`.

### T009 — modal.js, toast.js (المكوّنات العامة)
**🤖 رخيص**
**الملفات:** `scripts/components/modal.js`, `scripts/components/toast.js`
**المتطلبات:** انسخ القالبين بالضبط من `03-code-patterns.md` القسمين 4 و5.

---

## Phase 1 — تسجيل الدخول والتوجيه

### T101 — auth-service.js
**🤖 رخيص**
**الملفات:** `scripts/services/auth-service.js`
**المتطلبات:**
```js
export async function login(email, password) {
  // يبحث في User عبر findOne، يقارن passwordHash (استخدم دالة hash بسيطة SHA-256 عبر crypto.subtle)
  // يرجع { success: true, user } أو { success: false, message }
}
export async function hashPassword(password) { /* SHA-256 hex عبر crypto.subtle.digest */ }
```
**معيار القبول (يرتبط بـ US-1.1):** تسجيل الدخول بحساب المدير التجريبي من T007 ينجح.

### T102 — session.js
**🤖 رخيص**
**الملفات:** `scripts/shared/session.js`
**المتطلبات:** انسخ التوقيعات من `02-plan.md` القسم 7 ونفّذها عبر `sessionStorage`.

### T103 — router-guard.js
**🤖 رخيص**
**الملفات:** `scripts/shared/router-guard.js`
**المتطلبات:** انسخ القالب بالضبط من `03-code-patterns.md` القسم 6.
**معيار القبول (يرتبط بـ US-1.2):** فتح `pages/students.html` بدون تسجيل دخول يُعيد التوجيه لـ `index.html`.

### T104 — index.html + scripts/pages/login.js
**🤖 رخيص**
**المتطلبات:** نموذج بريد/كلمة مرور بسيط بالمنتصف، شعار المدرسة، عنوان "مدرسة السلام". عند الإرسال: استدعاء `login()`، عند النجاح `setSession(user)` ثم `location.href = 'pages/dashboard-' + user.role + '.html'`. عند الفشل: `showToast(message, "error")`.
**معيار القبول:** يطابق US-1.1 بالكامل.

### T105 — navbar.js + sidebar.js (المكوّنات العامة)
**🤖 رخيص**
**المتطلبات:**
- `navbar.js`: يعرض اسم المستخدم الحالي (من `getSession()`)، شعار المدرسة، أيقونة جرس إشعارات (فارغة الوظيفة حاليًا، تُفعَّل في T5xx)، زر "تسجيل خروج" يستدعي `clearSession()` ويوجّه لـ `index.html`.
- `sidebar.js`: قائمة روابط **مختلفة حسب `session.role`** (مثال: admin يرى كل الروابط، teacher يرى فقط "لوحتي، الجدول، الحضور، الدرجات"، student/parent يرون فقط "لوحتي، الجدول، الدرجات، الإشعارات").
**معيار القبول (يرتبط بـ US-1.3):** تسجيل الخروج يعمل من كل الصفحات.

---

## Phase 2 — الطلاب / الفصول / المدرسين / المواد (نمط CRUD متكرر)

> كل مهمة هنا تتبع **حرفيًا** قالب "CRUD Page Pattern" و"Service Pattern" من `03-code-patterns.md`. هذا القسم مثالي للنماذج الرخيصة لأن T202 وT204 وT206 وT208 متطابقة في البنية.

### T201 — class-service.js
**🤖 رخيص** — قالب Service Pattern، `{{Entity}} = Class`.

### T202 — classes.html + scripts/pages/classes.js
**🤖 رخيص** — قالب CRUD Page، الحقول: `name, level, section`. الأدوار المسموحة: `["admin"]`.
**معيار القبول:** يطابق US-2.4.

### T203 — student-service.js
**🤖 رخيص** — قالب Service Pattern، `{{Entity}} = Student`. أضف دالة إضافية:
```js
export async function getStudentsByClass(classId) { return find("Student", s => s.classId === classId); }
```

### T204 — students.html + scripts/pages/students.js
**🤖 رخيص** — قالب CRUD Page، الحقول: `academicNumber (تلقائي عبر generateAcademicNumber), name (ضمن User مرتبط), classId (قائمة منسدلة من getAllClasses), parentId, birthDate, gender`. أضف فلتر إضافي فوق الجدول: قائمة منسدلة لاختيار الصف تُصفّي القائمة عبر `getStudentsByClass`.
**معيار القبول:** يطابق US-2.1, US-2.2, US-2.3 بالكامل.

### T205 — subject-service.js
**🤖 رخيص** — قالب Service Pattern، `{{Entity}} = Subject`.

### T206 — teacher-service.js
**🤖 رخيص** — قالب Service Pattern، `{{Entity}} = Teacher`. أضف:
```js
export async function assignSubjects(teacherId, subjectIds) { return update("Teacher", teacherId, { subjectIds }); }
```

### T207 — subjects.html + scripts/pages/subjects.js
**🤖 رخيص** — قالب CRUD Page، الحقول: `name, classId (قائمة من Class), teacherId (قائمة من Teacher), weeklyHours`.
**معيار القبول:** يطابق US-3.1 جزئيًا (ربط المادة بمدرس).

### T208 — teachers.html + scripts/pages/teachers.js
**🤖 رخيص** — قالب CRUD Page، الحقول: `name (ضمن User), specialization`. أضف في نموذج التعديل قائمة اختيار متعدد (Multi-select) للمواد تستدعي `assignSubjects`.
**معيار القبول:** يطابق US-3.1 بالكامل.

---

## Phase 3 — الجداول الدراسية

### T301 — schedule-service.js
**🤖 متوسط**
**المتطلبات:**
```js
export async function getScheduleByClass(classId) { return find("Schedule", s => s.classId === classId); }
export async function getScheduleByTeacher(teacherId) { return find("Schedule", s => s.teacherId === teacherId); }
export async function hasConflict(teacherId, day, period, excludeId = null) {
  const all = await find("Schedule", s => s.teacherId === teacherId && s.day === day && s.period === period);
  return all.some(s => s.id !== excludeId);
}
export async function addScheduleEntry(data) {
  const conflict = await hasConflict(data.teacherId, data.day, data.period);
  if (conflict) return { success: false, message: "تعارض في الجدول" };
  const entry = await create("Schedule", data);
  return { success: true, entry };
}
```

### T302 — schedule.html + scripts/pages/schedule.js
**🤖 متوسط**
**المتطلبات:** واجهة Grid (جدول: صفوف = الحصص 1-7، أعمدة = الأيام الخمسة). المدير يختار فصلًا من قائمة منسدلة، ثم يضغط على أي خانة فارغة لفتح Modal لاختيار (المادة، المدرس)، عند الحفظ يستدعي `addScheduleEntry`، إذا رجعت `success: false` يعرض `showToast(message, "error")` بالأحمر ولا يُغلق الـModal. للمدرس والطالب: نفس الصفحة لكن للعرض فقط (بدون إمكانية التعديل) مفلترة تلقائيًا حسب `session`.
**معيار القبول:** يطابق US-3.2 و US-3.3 بالكامل.

---

## Phase 4 — الحضور والدرجات والشهادات

### T401 — attendance-service.js
**🤖 متوسط**
```js
export async function getAttendanceRecord(classId, subjectId, date) {
  return find("Attendance", a => a.classId === classId && a.subjectId === subjectId && a.date === date);
}
export async function saveAttendance(records) {
  // records: [{studentId, classId, subjectId, date, status, recordedBy}]
  // لكل سجل: إن وُجد سجل سابق بنفس (studentId+subjectId+date) نفّذ update وإلا create
  // إن كانت status === "absent" أنشئ إشعارًا لولي أمر الطالب عبر notification-service
}
export async function getAttendanceRateForStudent(studentId) {
  // ترجع نسبة مئوية = (عدد present) / (إجمالي السجلات) * 100
}
```
**معيار القبول:** يطابق US-4.1 و US-4.2.

### T402 — attendance.html + scripts/pages/attendance.js
**🤖 متوسط**
**المتطلبات:** أدوات اختيار (فصل، مادة، تاريخ) في الأعلى، ثم عند الاختيار تُحمَّل قائمة طلاب الفصل مع 4 أزرار حالة لكل طالب (حاضر أخضر افتراضيًا، غائب أحمر، متأخر برتقالي، غياب بعذر رمادي) — تحميل الحالات المحفوظة سابقًا إن وُجدت عبر `getAttendanceRecord`. زر "حفظ الكل" يستدعي `saveAttendance`.
**الأدوار المسموحة:** `["teacher"]`.

### T403 — grade-service.js
**🤖 متوسط**
**المتطلبات:** استخدم دوال `calculateFinalScore` و`getGradeLabel` من `02-plan.md` القسم 8، مع:
```js
export async function saveGrade(studentId, subjectId, term, quizScore, assignmentScore, examScore) {
  const finalScore = calculateFinalScore(quizScore, assignmentScore, examScore);
  const grade = getGradeLabel(finalScore);
  const existing = await findOne("Grade", g => g.studentId === studentId && g.subjectId === subjectId && g.term === term);
  const data = { studentId, subjectId, term, quizScore, assignmentScore, examScore, finalScore, grade };
  return existing ? update("Grade", existing.id, data) : create("Grade", data);
}
export async function getGradesByStudent(studentId) { return find("Grade", g => g.studentId === studentId); }
```

### T404 — grades.html + scripts/pages/grades.js
**🤖 متوسط**
**المتطلبات:** اختيار (فصل، مادة، فصل دراسي)، جدول طلاب مع 3 حقول رقمية لكل طالب (حد أقصى 20/30/50 على الترتيب — تحقق `isInRange` قبل الحفظ)، عمود "الدرجة النهائية" يُحسب تلقائيًا ويتحدث فور الكتابة (Live). زر حفظ يستدعي `saveGrade` لكل طالب.
**الأدوار المسموحة:** `["teacher"]`. **معيار القبول:** يطابق US-5.1 و US-5.2 (الجزء المعروض للطالب يُبنى في dashboard-student.js بنفس دالة `getGradesByStudent`).

### T405 — certificate-service.js
**🤖 متوسط**
**المتطلبات:**
```js
export async function generateCertificate(studentId, term) {
  const grades = await getGradesByStudent(studentId); // مفلترة بـ term
  const average = grades.reduce((s, g) => s + g.finalScore, 0) / grades.length;
  const gradeLabel = getGradeLabel(average);
  const pdfDataUrl = buildCertificatePdf(student, grades, average, gradeLabel); // عبر jsPDF
  return create("Certificate", { studentId, term, generatedDate: new Date().toISOString(), averageScore: average, gradeLabel, pdfDataUrl });
}
```
**ملاحظة:** دالة `buildCertificatePdf` تُبنى باستخدام jsPDF API القياسي: عنوان "مدرسة السلام"، اسم الطالب، الصف، جدول الدرجات، المعدل، التقدير، تاريخ الإصدار، وتصدير كـ Data URL عبر `doc.output('dataurlstring')`.

### T406 — certificates.html + scripts/pages/certificates.js
**🤖 رخيص** (الواجهة بسيطة؛ المنطق الثقيل في T405)
**المتطلبات:** اختيار طالب وفصل دراسي، زر "إصدار شهادة"، بعد الإصدار زر "تحميل PDF" يفتح `pdfDataUrl` في تبويب جديد.
**الأدوار المسموحة:** `["admin"]`. **معيار القبول:** يطابق US-5.3.

---

## Phase 5 — المالية والإشعارات

### T501 — payment-service.js
**🤖 رخيص** — قالب Service Pattern موسّع بـ:
```js
export async function recordPayment(paymentId, amountPaid) {
  const payment = await findById("Payment", paymentId);
  const newPaidAmount = (payment.paidAmount || 0) + amountPaid;
  const status = newPaidAmount >= payment.amount ? "paid" : "partial";
  return update("Payment", paymentId, { paidAmount: newPaidAmount, status, paidDate: new Date().toISOString() });
}
export async function getUpcomingDuePayments(daysThreshold = 3) {
  // ترجع كل Payment بحالة != "paid" وdueDate خلال daysThreshold أيام
}
```

### T502 — expense-service.js
**🤖 رخيص** — قالب Service Pattern قياسي، `{{Entity}} = Expense`.

### T503 — finance.html + scripts/pages/finance.js
**🤖 متوسط**
**المتطلبات:** 3 تبويبات (Tabs بـ JS بسيط، إظهار/إخفاء `div`):
1. "المدفوعات": جدول طلاب + رسومهم + حالة الدفع (شارة خضراء/حمراء/برتقالية) + زر "تسجيل دفعة" (Modal يستدعي `recordPayment`).
2. "المصروفات": قالب CRUD Page قياسي لـ Expense.
3. "التقرير": 3 بطاقات (إجمالي إيرادات = مجموع paidAmount، إجمالي مصروفات، الصافي) + رسم بياني خطي شهري (قالب Chart.js من `03-code-patterns.md` القسم 7).
**الأدوار المسموحة:** `["admin"]`. **معيار القبول:** يطابق US-6.1 إلى US-6.4.

### T504 — notification-service.js
**🤖 رخيص**
```js
export async function notifyUser(userId, title, message, type, relatedPageUrl = null) {
  return create("Notification", { userId, title, message, type, relatedPageUrl, isRead: false });
}
export async function getNotificationsForUser(userId) {
  return find("Notification", n => n.userId === userId);
}
export async function markAsRead(notificationId) { return update("Notification", notificationId, { isRead: true }); }
export async function getUnreadCount(userId) {
  const all = await getNotificationsForUser(userId);
  return all.filter(n => !n.isRead).length;
}
export async function broadcastNotification(title, message, targetRole = "all", targetClassId = null) {
  // يجلب المستخدمين المستهدفين حسب targetRole/targetClassId وينشئ إشعارًا لكل واحد عبر notifyUser
}
```
**ملاحظة تنفيذية:** يجب الرجوع لهذا الملف من `attendance-service.js` (T401) و`payment-service.js` (T501) لإرسال الإشعارات التلقائية، ومن `notification-bell.js` (T505) لعرضها.

### T505 — notification-bell.js (تفعيل الجرس في navbar)
**🤖 رخيص**
**المتطلبات:** عند تحميل أي صفحة (استدعاء من `navbar.js`)، اجلب `getUnreadCount(session.id)` واعرضه كعداد أحمر صغير فوق أيقونة الجرس. عند الضغط: افتح قائمة منسدلة بآخر 10 إشعارات (`getNotificationsForUser`)، عند الضغط على إشعار استدعِ `markAsRead` ثم `location.href = relatedPageUrl` إن وُجد.
**معيار القبول:** يطابق US-8.1 بالكامل.

### T506 — notifications.html + scripts/pages/notifications-page.js
**🤖 رخيص**
**المتطلبات:** قسم علوي (يظهر فقط لو `session.role === "admin"`): نموذج إرسال (رسالة + قائمة منسدلة للفئة المستهدفة) يستدعي `broadcastNotification`. قسم سفلي (للجميع): قائمة كامل إشعاراتي.
**معيار القبول:** يطابق US-8.2.

---

## Phase 6 — لوحات التحكم والإحصائيات

### T601 — dashboard-admin.html + scripts/pages/dashboard-admin.js
**🤖 رخيص**
**المتطلبات:** 4 بطاقات (عدد الطلاب من `getAllStudents().length`، عدد المدرسين، نسبة الحضور العامة، صافي الرصيد المالي) + 3 Canvas تُبنى بقالب Chart.js: (1) عمودي: توزيع الطلاب حسب الصفوف، (2) دائري: نسبة حضور/غياب عامة، (3) خطي: إيرادات مقابل مصروفات آخر 6 أشهر.
**معيار القبول:** يطابق US-7.1.

### T602 — dashboard-teacher.html + scripts/pages/dashboard-teacher.js
**🤖 رخيص** — جدول اليوم (فلترة `getScheduleByTeacher` حسب اليوم الحالي)، روابط سريعة لصفحتي الحضور والدرجات، عدد فصوله.

### T603 — dashboard-student.html + scripts/pages/dashboard-student.js
**🤖 رخيص** — نسبة حضور (Progress bar ملوّن حسب `getAttendanceRateForStudent`)، آخر 5 درجات (`getGradesByStudent`)، جدول اليوم.

### T604 — dashboard-parent.html + scripts/pages/dashboard-parent.js
**🤖 رخيص** — بطاقة منفصلة لكل ابن مرتبط (`Parent.studentIds`) تعرض: حضوره، آخر درجاته، مستحقاته المالية غير المدفوعة.
**معيار القبول (T601-T604):** يطابق US-7.2.

---

## Phase 7 — الاختبار والربط النهائي

### T701 — مراجعة شاملة (Regression Pass)
**🤖 متوسط**
**المتطلبات:** المرور على كل قصص المستخدم في `01-specify.md` (US-1.1 حتى US-8.2) والتأكد من تحقق معيار القبول فعليًا داخل المتصفح، مع تسجيل أي خلل في ملف `05-bug-log.md` (يُنشأ عند الحاجة) بصيغة: `[US-x.x] الوصف - الحالة`.

### T702 — تنظيف الكود ومطابقة الدستور
**🤖 رخيص**
**المتطلبات:** التحقق من كل ملف JS بحثًا عن: (1) عدم استدعاء IndexedDB مباشرة خارج `local-store.js`، (2) لا Hex Colors خارج `variables.css`، (3) تطابق أسماء الملفات مع `00-constitution.md` القسم 1.

### T703 — README.md
**🤖 رخيص**
**المتطلبات:** كتابة تعليمات التشغيل (فتح `index.html` مباشرة أو عبر خادم محلي بسيط `python -m http.server`)، وبيانات الدخول التجريبية من T007.
