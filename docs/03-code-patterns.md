# 03 - أنماط الكود الموحدة (Code Patterns)

هذه القوالب **جاهزة للنسخ مباشرة**. أي نموذج رخيص ينفذ مهمة CRUD يجب أن يبدأ من هذا القالب ويستبدل فقط الأسماء المميزة بلون (المكتوبة بـ `{{...}}`)، دون تغيير البنية العامة.

---

## 1. قالب صفحة HTML عامة (Page Template)

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_TITLE}} | مدرسة السلام</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles/variables.css">
  <link rel="stylesheet" href="../styles/base.css">
  <link rel="stylesheet" href="../styles/layout.css">
  <link rel="stylesheet" href="../styles/components/navbar.css">
  <link rel="stylesheet" href="../styles/components/sidebar.css">
  <link rel="stylesheet" href="../styles/components/table.css">
  <link rel="stylesheet" href="../styles/components/modal.css">
  <link rel="stylesheet" href="../styles/components/form.css">
</head>
<body>
  <div id="navbar-container"></div>
  <div class="app-layout">
    <div id="sidebar-container"></div>
    <main class="main-content">
      <h1 class="page-title">{{PAGE_TITLE}}</h1>
      <!-- محتوى الصفحة هنا -->
      <div id="page-content"></div>
    </main>
  </div>
  <div id="modal-container"></div>
  <div id="toast-container"></div>

  <script type="module" src="../scripts/pages/{{PAGE_SCRIPT}}.js"></script>
</body>
</html>
```

---

## 2. قالب ملف JS لصفحة إدارة كيان (CRUD Page Pattern)

```js
// scripts/pages/{{page-name}}.js
import { requireRole } from "../shared/router-guard.js";
import { renderNavbar } from "../components/navbar.js";
import { renderSidebar } from "../components/sidebar.js";
import { showToast } from "../components/toast.js";
import { openModal, closeModal } from "../components/modal.js";
import {
  getAll{{Entities}},
  add{{Entity}},
  update{{Entity}},
  delete{{Entity}},
} from "../services/{{entity}}-service.js";

requireRole(["admin"]); // عدّل الأدوار المسموحة حسب الصفحة
renderNavbar();
renderSidebar();

let all{{Entities}} = [];

async function loadAndRender() {
  all{{Entities}} = await getAll{{Entities}}();
  renderTable(all{{Entities}});
}

function renderTable(items) {
  const container = document.getElementById("page-content");
  container.innerHTML = `
    <div class="toolbar">
      <input type="text" id="search-input" placeholder="بحث..." class="input-search">
      <button id="add-btn" class="btn btn-primary">+ إضافة {{EntityLabel}}</button>
    </div>
    <table class="data-table">
      <thead><tr>{{TABLE_HEADERS}}</tr></thead>
      <tbody>
        ${items.map(item => `
          <tr data-id="${item.id}">
            {{TABLE_ROW_CELLS}}
            <td>
              <button class="btn-icon edit-btn" data-id="${item.id}">تعديل</button>
              <button class="btn-icon delete-btn" data-id="${item.id}">حذف</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("add-btn").addEventListener("click", () => openFormModal(null));
  document.querySelectorAll(".edit-btn").forEach(btn =>
    btn.addEventListener("click", (e) => {
      const item = all{{Entities}}.find(x => x.id === e.target.dataset.id);
      openFormModal(item);
    })
  );
  document.querySelectorAll(".delete-btn").forEach(btn =>
    btn.addEventListener("click", (e) => confirmDelete(e.target.dataset.id))
  );
  document.getElementById("search-input").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    const filtered = all{{Entities}}.filter(x => x.name?.includes(q));
    renderTable(filtered);
  });
}

function openFormModal(item) {
  const isEdit = !!item;
  openModal({
    title: isEdit ? "تعديل {{EntityLabel}}" : "إضافة {{EntityLabel}}",
    bodyHtml: `{{FORM_FIELDS_HTML}}`,
    onSubmit: async (formData) => {
      if (isEdit) {
        await update{{Entity}}(item.id, formData);
        showToast("تم التحديث بنجاح", "success");
      } else {
        await add{{Entity}}(formData);
        showToast("تمت الإضافة بنجاح", "success");
      }
      closeModal();
      loadAndRender();
    },
  });
}

function confirmDelete(id) {
  openModal({
    title: "تأكيد الحذف",
    bodyHtml: `<p>هل أنت متأكد من الحذف؟ لا يمكن التراجع.</p>`,
    confirmLabel: "حذف",
    confirmClass: "btn-danger",
    onSubmit: async () => {
      await delete{{Entity}}(id);
      showToast("تم الحذف", "success");
      closeModal();
      loadAndRender();
    },
  });
}

loadAndRender();
```

---

## 3. قالب خدمة (Service Pattern) — يُستخدم لكل الكيانات

```js
// scripts/services/{{entity}}-service.js
import { create, find, findOne, findById, update, remove } from "../db/local-store.js";

const ENTITY = "{{Entity}}";

export async function getAll{{Entities}}() { return find(ENTITY); }
export async function get{{Entity}}ById(id) { return findById(ENTITY, id); }
export async function add{{Entity}}(data) { return create(ENTITY, data); }
export async function update{{Entity}}(id, data) { return update(ENTITY, id, data); }
export async function delete{{Entity}}(id) { return remove(ENTITY, id); }
```

---

## 4. قالب نافذة منبثقة عامة (modal.js) — يُنشأ مرة واحدة فقط في Phase 0

```js
// scripts/components/modal.js
let currentOnSubmit = null;

export function openModal({ title, bodyHtml, onSubmit, confirmLabel = "حفظ", confirmClass = "btn-primary" }) {
  currentOnSubmit = onSubmit;
  const container = document.getElementById("modal-container");
  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h3>${title}</h3>
          <button id="modal-close">×</button>
        </div>
        <form id="modal-form" class="modal-body">
          ${bodyHtml}
        </form>
        <div class="modal-footer">
          <button type="button" id="modal-cancel" class="btn btn-secondary">إلغاء</button>
          <button type="submit" form="modal-form" class="btn ${confirmClass}">${confirmLabel}</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-cancel").addEventListener("click", closeModal);
  document.getElementById("modal-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target).entries());
    if (currentOnSubmit) await currentOnSubmit(formData);
  });
}

export function closeModal() {
  document.getElementById("modal-container").innerHTML = "";
  currentOnSubmit = null;
}
```

---

## 5. قالب Toast (رسائل نجاح/خطأ)

```js
// scripts/components/toast.js
export function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`; // success -> أخضر، error -> أحمر
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

---

## 6. قالب حماية الصفحة (router-guard.js) — يُنشأ مرة واحدة في Phase 1

```js
// scripts/shared/router-guard.js
import { getSession, isLoggedIn } from "./session.js";

export function requireRole(allowedRoles) {
  if (!isLoggedIn()) {
    window.location.href = "../index.html";
    return;
  }
  const session = getSession();
  if (!allowedRoles.includes(session.role)) {
    window.location.href = `dashboard-${session.role}.html`;
  }
}
```

---

## 7. قالب رسم بياني موحد (Chart.js)

```js
// داخل ملف الصفحة، بعد تحميل بيانات معينة:
new Chart(document.getElementById("{{canvasId}}"), {
  type: "{{bar|pie|line}}",
  data: {
    labels: {{labelsArray}},
    datasets: [{
      data: {{dataArray}},
      backgroundColor: ["#1E3A8A", "#16A34A", "#DC2626", "#F59E0B", "#3B82F6"],
    }],
  },
  options: { responsive: true, plugins: { legend: { position: "bottom" } } },
});
```

---

## 8. تعليمات صارمة للنموذج الرخيص عند استخدام هذه القوالب

1. لا تُعِد كتابة القالب من الصفر؛ انسخه واستبدل `{{...}}` فقط.
2. لا تضف حقولًا أو دوالًا غير موجودة في القالب إلا إذا طلبت المهمة ذلك صراحة.
3. أسماء الكيانات (`{{Entity}}`) يجب أن تُؤخذ حرفيًا من جدول `SCHEMAS` في `02-plan.md` (مثال: `Student`, وليس `students` أو `StudentModel`).
4. أي نص ظاهر للمستخدم (عناوين، أزرار، رسائل) يجب أن يكون بالعربية الفصحى البسيطة.
