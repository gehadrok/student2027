# 02 - الخطة التقنية (Plan)
## نظام إدارة مدرسة السلام

هذا الملف هو **المرجع التقني الوحيد** لأي نموذج ذكاء اصطناعي منفذ. أي اختلاف بين هذا الملف وأي افتراض من النموذج → يُعتمد هذا الملف.

---

## 1. المكتبات المسموح بها (عبر CDN فقط)

```html
<!-- Realm Web SDK -->
<script src="https://unpkg.com/realm-web@2.0.0/dist/bundle.iife.js"></script>
<!-- Chart.js للرسوم البيانية -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<!-- jsPDF لتوليد الشهادات والتقارير -->
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
<!-- الخط -->
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
```
لا يجوز إضافة أي مكتبة أخرى دون تحديث هذا الملف أولًا.

> **ملاحظة عن RealmDB:** بما أن التطبيق يعمل بالكامل في المتصفح بدون سيرفر Node.js في هذه المرحلة، وRealm Web SDK يتطلب Atlas App Services (سحابي)، فإن التنفيذ الأولي (Local-Only) سيستخدم طبقة تجريدية `db/local-store.js` تحاكي واجهة Realm (نفس أسماء الدوال: `create`, `find`, `findOne`, `update`, `delete`) لكن تُخزِّن فعليًا في `IndexedDB` عبر واجهة بسيطة. هذا يسمح لاحقًا بتبديل التنفيذ الداخلي إلى Realm Web SDK الحقيقي (Local Realm Device Sync) دون تغيير أي كود في طبقة `services/` لأن الواجهة (Interface) واحدة. **كل الأكواد يجب أن تستدعي فقط دوال `db/local-store.js` ولا تتعامل مع IndexedDB مباشرة.**

---

## 2. هيكل الملفات الكامل

```
al-salam-school/
├── index.html
├── README.md
├── styles/
│   ├── variables.css
│   ├── base.css
│   ├── layout.css
│   └── components/
│       ├── navbar.css
│       ├── sidebar.css
│       ├── table.css
│       ├── modal.css
│       ├── form.css
│       ├── card.css
│       └── notifications.css
├── assets/
│   ├── logo/logo.svg
│   └── icons/ (svg icons: user, book, calendar, money, bell, check, x, edit, trash, chart)
├── scripts/
│   ├── db/
│   │   ├── local-store.js         # طبقة تجريدية فوق IndexedDB (واجهة تحاكي Realm)
│   │   └── schemas.js             # تعريف الكيانات والحقول الافتراضية
│   ├── services/
│   │   ├── auth-service.js
│   │   ├── student-service.js
│   │   ├── teacher-service.js
│   │   ├── class-service.js
│   │   ├── subject-service.js
│   │   ├── schedule-service.js
│   │   ├── attendance-service.js
│   │   ├── grade-service.js
│   │   ├── certificate-service.js
│   │   ├── payment-service.js
│   │   ├── expense-service.js
│   │   └── notification-service.js
│   ├── shared/
│   │   ├── router-guard.js        # حماية الصفحات حسب الدور
│   │   ├── session.js             # إدارة جلسة المستخدم الحالي
│   │   ├── utils.js               # دوال مساعدة عامة (تنسيق تاريخ، أرقام...)
│   │   ├── validators.js          # دوال التحقق من صحة النماذج
│   │   └── seed-data.js           # بيانات تجريبية أولية (Seeding)
│   ├── components/
│   │   ├── navbar.js
│   │   ├── sidebar.js
│   │   ├── modal.js
│   │   ├── data-table.js
│   │   ├── notification-bell.js
│   │   └── toast.js               # رسائل نجاح/خطأ منبثقة
│   └── pages/
│       ├── login.js
│       ├── dashboard-admin.js
│       ├── dashboard-teacher.js
│       ├── dashboard-student.js
│       ├── dashboard-parent.js
│       ├── students.js
│       ├── classes.js
│       ├── teachers.js
│       ├── subjects.js
│       ├── schedule.js
│       ├── attendance.js
│       ├── grades.js
│       ├── certificates.js
│       ├── finance.js
│       └── notifications-page.js
└── pages/
    ├── dashboard-admin.html
    ├── dashboard-teacher.html
    ├── dashboard-student.html
    ├── dashboard-parent.html
    ├── students.html
    ├── classes.html
    ├── teachers.html
    ├── subjects.html
    ├── schedule.html
    ├── attendance.html
    ├── grades.html
    ├── certificates.html
    ├── finance.html
    └── notifications.html
```

**قاعدة تسمية ثابتة:** كل `pages/x.html` يقابله بالضبط `scripts/pages/x.js` بنفس الاسم (بدون لاحقة `-page` إلا `notifications-page.js` لتفادي تعارض مع `notification-service.js`).

---

## 3. نموذج البيانات الكامل (Schemas)

يُكتب في `scripts/db/schemas.js` بالضبط كما يلي (أسماء الحقول نهائية، لا تغييرها في أي مهمة):

```js
export const SCHEMAS = {
  User: {
    fields: ["id", "name", "email", "passwordHash", "role", "phone", "photoUrl", "createdAt"],
    // role: "admin" | "teacher" | "student" | "parent"
  },
  Student: {
    fields: ["id", "userId", "academicNumber", "classId", "parentId", "birthDate", "gender", "status", "createdAt"],
    // status: "active" | "inactive"
  },
  Teacher: {
    fields: ["id", "userId", "specialization", "subjectIds", "createdAt"],
  },
  Parent: {
    fields: ["id", "userId", "studentIds", "createdAt"],
  },
  Class: {
    fields: ["id", "name", "level", "section", "createdAt"],
    // مثال: level="الصف الأول", section="أ"
  },
  Subject: {
    fields: ["id", "name", "classId", "teacherId", "weeklyHours", "createdAt"],
  },
  Schedule: {
    fields: ["id", "classId", "subjectId", "teacherId", "day", "period", "createdAt"],
    // day: "sunday".."thursday", period: 1..7
  },
  Attendance: {
    fields: ["id", "studentId", "classId", "subjectId", "date", "status", "recordedBy", "createdAt"],
    // status: "present" | "absent" | "late" | "excused"
  },
  Grade: {
    fields: ["id", "studentId", "subjectId", "term", "quizScore", "assignmentScore", "examScore", "finalScore", "grade", "createdAt"],
    // term: "term1" | "term2"
    // الأوزان الثابتة: quiz=20%, assignment=30%, exam=50% (max لكل: quiz=20, assignment=30, exam=50)
    // grade (تقدير نصي): يُحسب من finalScore عبر utils.getGradeLabel()
  },
  Certificate: {
    fields: ["id", "studentId", "term", "generatedDate", "averageScore", "gradeLabel", "pdfDataUrl"],
  },
  Payment: {
    fields: ["id", "studentId", "amount", "paidAmount", "dueDate", "status", "paidDate", "createdAt"],
    // status: "unpaid" | "partial" | "paid"
  },
  Expense: {
    fields: ["id", "category", "amount", "date", "description", "createdAt"],
  },
  Notification: {
    fields: ["id", "userId", "title", "message", "type", "relatedPageUrl", "isRead", "createdAt"],
    // type: "attendance" | "grade" | "payment" | "schedule" | "general"
  },
};
```

---

## 4. واجهة طبقة قاعدة البيانات (db/local-store.js)

كل الدوال التالية **إلزامية بنفس التوقيع (Signature)** — أي مهمة تنشئ هذا الملف يجب أن تنتج بالضبط هذه الدوال:

```js
// scripts/db/local-store.js
export async function initDB() { /* يفتح IndexedDB وينشئ object stores لكل كيان في SCHEMAS */ }
export async function create(entityName, data) { /* يضيف id (uuid) و createdAt تلقائيًا، يرجع السجل الكامل */ }
export async function find(entityName, filterFn = null) { /* يرجع مصفوفة، مع فلترة اختيارية عبر دالة */ }
export async function findOne(entityName, filterFn) { /* يرجع أول سجل مطابق أو null */ }
export async function findById(entityName, id) { /* يرجع سجل واحد أو null */ }
export async function update(entityName, id, patchData) { /* يدمج patchData مع السجل الحالي ويحفظ */ }
export async function remove(entityName, id) { /* يحذف السجل */ }
```

---

## 5. طبقة الخدمات (services) — قاعدة عامة

كل ملف في `services/` **يستورد فقط من `db/local-store.js`** ولا يتعامل مع IndexedDB مباشرة. مثال نمطي يجب اتباعه لكل الخدمات:

```js
// scripts/services/student-service.js
import { create, find, findOne, findById, update, remove } from "../db/local-store.js";

const ENTITY = "Student";

export async function addStudent(data) { return create(ENTITY, data); }
export async function getAllStudents() { return find(ENTITY); }
export async function getStudentsByClass(classId) { return find(ENTITY, s => s.classId === classId); }
export async function getStudentById(id) { return findById(ENTITY, id); }
export async function updateStudent(id, data) { return update(ENTITY, id, data); }
export async function deleteStudent(id) { return remove(ENTITY, id); }
```
كل خدمة أخرى (`grade-service.js`, `attendance-service.js`, إلخ) تتبع نفس النمط بالضبط، مع إضافة دوال منطق الأعمال الخاصة بها (مثل `calculateFinalScore` في `grade-service.js`).

---

## 6. نظام التوجيه (Routing) بدون Framework

لا يوجد Router حقيقي؛ التطبيق متعدد الصفحات (MPA - Multi Page Application):
- كل صفحة ملف `.html` مستقل.
- التنقل عبر روابط `<a href="pages/x.html">` عادية أو `location.href` من JS.
- الحماية تتم في بداية كل `scripts/pages/x.js` عبر استدعاء:
```js
import { requireRole } from "../shared/router-guard.js";
requireRole(["admin"]); // يعيد التوجيه فورًا إذا لم يطابق الدور
```

---

## 7. إدارة الجلسة (session.js)

```js
// scripts/shared/session.js
export function setSession(user) { /* يحفظ {id, name, role} في sessionStorage كـ JSON */ }
export function getSession() { /* يرجع الكائن أو null */ }
export function clearSession() { /* يمسح sessionStorage */ }
export function isLoggedIn() { /* boolean */ }
```
> استخدام `sessionStorage` هنا مقبول لأنه **جلسة فقط (Token)** وليس قاعدة بيانات، بما يتوافق مع القاعدة رقم 2 في `00-constitution.md`.

---

## 8. منطق حساب الدرجات (grade-service.js)

```js
const WEIGHTS = { quiz: 20, assignment: 30, exam: 50 }; // مجموع = 100

export function calculateFinalScore(quizScore, assignmentScore, examScore) {
  return quizScore + assignmentScore + examScore; // القيم تُدخل مباشرة ضمن الحد الأقصى لكل جزء
}

export function getGradeLabel(finalScore) {
  if (finalScore >= 90) return "ممتاز";
  if (finalScore >= 80) return "جيد جدًا";
  if (finalScore >= 70) return "جيد";
  if (finalScore >= 60) return "مقبول";
  return "راسب";
}
```

---

## 9. تعريف الشاشات ومحتواها الدقيق (لكل دور)

| الصفحة | الأدوار المسموحة | العناصر الأساسية |
|---|---|---|
| `dashboard-admin.html` | admin | 4 بطاقات إحصائية + 3 رسوم بيانية (Chart.js) |
| `dashboard-teacher.html` | teacher | جدول اليوم، روابط سريعة (تسجيل حضور/درجات)، عدد فصوله |
| `dashboard-student.html` | student | نسبة الحضور، آخر الدرجات، جدوله اليوم |
| `dashboard-parent.html` | parent | بطاقة لكل ابن (حضور/درجات/مستحقات مالية) |
| `students.html` | admin | جدول + بحث + فلتر صف + إضافة/تعديل/حذف (Modal) |
| `classes.html` | admin | جدول الفصول + إضافة/تعديل/حذف |
| `teachers.html` | admin | جدول المدرسين + ربط مواد |
| `subjects.html` | admin | جدول المواد + ربط بفصل ومدرس |
| `schedule.html` | admin, teacher, student | Grid (أيام × حصص)، admin يحرر، غيره يشاهد فقط |
| `attendance.html` | teacher | اختيار فصل/مادة/تاريخ ثم قائمة تسجيل حالات |
| `grades.html` | teacher | اختيار فصل/مادة/فصل دراسي ثم إدخال درجات |
| `certificates.html` | admin | اختيار طالب + فصل دراسي + زر إصدار PDF |
| `finance.html` | admin | تبويبات: مدفوعات / مصروفات / تقرير |
| `notifications.html` | admin (إرسال) + الكل (عرض) | نموذج إرسال (admin فقط) + قائمة إشعاراتي |

---

## 10. لوحة الألوان التطبيقية (استخدام دلالي إلزامي)

| الحالة | اللون |
|---|---|
| حاضر / ناجح / مدفوع | `--color-success-green` |
| غائب / راسب / متأخر السداد | `--color-danger-red` |
| متأخر / غياب بعذر / معلّق | لون وسيط (اقتراح: برتقالي `#F59E0B` يُضاف كمتغير `--color-warning-orange`) |
| العناصر الأساسية (أزرار رئيسية، الشريط العلوي، الروابط النشطة) | `--color-primary-blue` |

---

## 11. مراحل التنفيذ (تربط بـ 03-tasks.md)

| المرحلة | النطاق | نموذج الذكاء الاصطناعي المقترح |
|---|---|---|
| Phase 0 | الهيكل، CSS، DB layer | نموذج متوسط (لإرساء الأساس بدقة) |
| Phase 1 | تسجيل الدخول + الحماية + Layout عام | نموذج رخيص (نمط مكرر وواضح) |
| Phase 2 | الطلاب/الفصول/المدرسين/المواد (CRUD متكرر النمط) | نموذج رخيص (يكرر نفس نمط CRUD من Phase 2 الأول) |
| Phase 3 | الجداول + كشف التعارض | نموذج متوسط (منطق أكثر تعقيدًا) |
| Phase 4 | الحضور + الدرجات + الشهادات | نموذج متوسط |
| Phase 5 | المالية + الإشعارات | نموذج رخيص (CRUD + شروط بسيطة) |
| Phase 6 | لوحات الإحصائيات (Chart.js) | نموذج رخيص (نسخ نمط رسم بياني موحد) |
| Phase 7 | اختبار شامل وربط نهائي | نموذج متوسط (مراجعة) |

> السبب: تكرار نمط CRUD موحّد بدقة في `03-code-patterns.md` يجعل معظم المهام "تعبئة قالب" لا تتطلب استدلالًا معقدًا، وهذا هو المناسب تمامًا للنماذج الرخيصة.
