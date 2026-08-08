/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Curriculum management screen: list, create, edit (upsert via PUT), and
 * delete. All mutations go through the REAL Academic REST API.
 */

import React, { useState } from 'react';
import {
  Plus, RefreshCw, Trash2, CheckCircle2, XCircle, Loader2, Pencil, BookOpen,
} from 'lucide-react';
import { useCurriculums } from '../hooks/useCurriculums';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { CurriculumApi, SaveCurriculumPayload } from '../types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function CurriculumsScreen() {
  const { items, isLoading, actionLoading, error, fetchItems, save, remove } = useCurriculums();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CurriculumApi | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CurriculumApi | null>(null);

  const [form, setForm] = useState<SaveCurriculumPayload>({
    id: '',
    code: '',
    nameAr: '',
    nameEn: '',
    gradeLevelId: '',
    isActive: true,
    displayOrder: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({
      id: '',
      code: '',
      nameAr: '',
      nameEn: '',
      gradeLevelId: '',
      isActive: true,
      displayOrder: 0,
    });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (item: CurriculumApi) => {
    setEditing(item);
    setForm({
      id: item.id,
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? '',
      gradeLevelId: item.gradeLevelId ?? '',
      isActive: item.isActive ?? true,
      displayOrder: item.displayOrder ?? 0,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.id.trim() || !form.code.trim() || !form.nameAr.trim()) {
      setFormError('يرجى تعبئة الحقول المطلوبة (المعرف، الكود، الاسم بالعربية)');
      return;
    }
    const res = await save(form, !!editing);
    if (res.success) {
      setShowForm(false);
      setEditing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">المناهج الدراسية</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة المناهج والمواد الدراسية لكل صف</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchItems}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            منهج جديد
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">قائمة المناهج</h2>
          <p className="text-xs text-slate-500 mt-0.5">إضافة وتعديل وحذف المناهج الدراسية</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin ml-2" />
            جاري التحميل...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">لا توجد مناهج دراسية بعد</p>
            <p className="text-slate-400 text-sm mt-1">ابدأ بإضافة أول منهج دراسي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-right px-5 py-3 font-bold">الكود</th>
                  <th className="text-right px-5 py-3 font-bold">الاسم (عربي)</th>
                  <th className="text-right px-5 py-3 font-bold">الاسم (إنجليزي)</th>
                  <th className="text-center px-5 py-3 font-bold">الصف</th>
                  <th className="text-center px-5 py-3 font-bold">الحالة</th>
                  <th className="text-center px-5 py-3 font-bold">الترتيب</th>
                  <th className="text-center px-5 py-3 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">{item.code}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{item.nameAr}</td>
                    <td className="px-5 py-3 text-slate-500">{item.nameEn || '-'}</td>
                    <td className="px-5 py-3 text-center text-slate-600">{item.gradeLevelId || '-'}</td>
                    <td className="px-5 py-3 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" /> نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold">
                          <XCircle className="w-3 h-3" /> غير نشط
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-600">{item.displayOrder ?? 0}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editing ? 'تعديل المنهج الدراسي' : 'إضافة منهج دراسي جديد'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="المعرف (ID)">
                  <input
                    value={form.id}
                    disabled={!!editing}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    placeholder="cur-sci-9"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50"
                  />
                </Field>
                <Field label="الكود (Code)">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="SCI-9"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="الاسم (عربي)">
                  <input
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    placeholder="علوم"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </Field>
                <Field label="الاسم (إنجليزي)">
                  <input
                    value={form.nameEn ?? ''}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    placeholder="Science"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    dir="ltr"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="الصف الدراسي">
                  <input
                    value={form.gradeLevelId ?? ''}
                    onChange={(e) => setForm({ ...form, gradeLevelId: e.target.value })}
                    placeholder="grade-9"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </Field>
                <Field label="الترتيب">
                  <input
                    type="number"
                    value={form.displayOrder ?? 0}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-slate-700">منهج نشط</span>
              </label>

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{formError}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'حفظ التعديلات' : 'إضافة المنهج'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="حذف المنهج الدراسي"
        message={deleteTarget ? `هل أنت متأكد من حذف المنهج "${deleteTarget.nameAr}"؟` : ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await remove(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

