/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Academic Calendar management screen: list, create, edit (upsert via PUT),
 * and delete. All mutations go through the REAL Academic REST API.
 */

import React, { useState } from 'react';
import {
  Plus, RefreshCw, Trash2, CheckCircle2, XCircle, Loader2, Pencil, CalendarDays,
} from 'lucide-react';
import { useAcademicCalendar } from '../hooks/useAcademicCalendar';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { AcademicCalendarApi, SaveAcademicCalendarPayload } from '../types';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function AcademicCalendarScreen() {
  const { items, isLoading, actionLoading, error, fetchItems, save, remove } = useAcademicCalendar();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AcademicCalendarApi | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicCalendarApi | null>(null);

  const [form, setForm] = useState<SaveAcademicCalendarPayload>({
    id: '',
    date: '',
    isInstructional: true,
    academicWeek: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({
      id: '',
      date: '',
      isInstructional: true,
      academicWeek: 1,
    });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (item: AcademicCalendarApi) => {
    setEditing(item);
    setForm({
      id: item.id,
      date: item.date,
      isInstructional: item.isInstructional,
      academicWeek: item.academicWeek ?? 1,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.id.trim() || !form.date) {
      setFormError('يرجى تعبئة الحقول المطلوبة (المعرف، التاريخ)');
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
          <h1 className="text-2xl font-black text-slate-800">التقويم الأكاديمي</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة أيام التقويم الدراسي والأسابيع الأكاديمية</p>
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
            إضافة يوم
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
          <h2 className="text-sm font-bold text-slate-800">أيام التقويم الأكاديمي</h2>
          <p className="text-xs text-slate-500 mt-0.5">إضافة وتعديل وحذف أيام التقويم الدراسي</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin ml-2" />
            جاري التحميل...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">لا توجد أيام في التقويم الأكاديمي بعد</p>
            <p className="text-slate-400 text-sm mt-1">ابدأ بإضافة أول يوم دراسي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-right px-5 py-3 font-bold">المعرف</th>
                  <th className="text-right px-5 py-3 font-bold">التاريخ</th>
                  <th className="text-center px-5 py-3 font-bold">الأسبوع الأكاديمي</th>
                  <th className="text-center px-5 py-3 font-bold">النوع</th>
                  <th className="text-center px-5 py-3 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">{item.id}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{item.date}</td>
                    <td className="px-5 py-3 text-center text-slate-600">{item.academicWeek ?? '-'}</td>
                    <td className="px-5 py-3 text-center">
                      {item.isInstructional ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" /> يوم دراسي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                          <XCircle className="w-3 h-3" /> إجازة
                        </span>
                      )}
                    </td>
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
                {editing ? 'تعديل يوم التقويم' : 'إضافة يوم للتقويم'} 
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
                    placeholder="day-2027-09-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50"
                  />
                </Field>
                <Field label="التاريخ">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </Field>
              </div>
              <Field label="الأسبوع الأكاديمي">
                <input
                  type="number"
                  value={form.academicWeek ?? 1}
                  onChange={(e) => setForm({ ...form, academicWeek: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isInstructional}
                  onChange={(e) => setForm({ ...form, isInstructional: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-slate-700">يوم دراسي (تعليمي)</span>
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
                  {editing ? 'حفظ التعديلات' : 'إضافة اليوم'}
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
        title="حذف يوم التقويم"
        message={deleteTarget ? `هل أنت متأكد من حذف يوم "${deleteTarget.date}"؟` : ''}
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
