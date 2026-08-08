/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Academic Years management screen: list, create, add terms, full lifecycle
 * (approve → activate → close → archive), term lifecycle (open/lock/close),
 * and delete. All mutations go through the REAL Academic REST API.
 */

import React, { useState } from 'react';
import { Plus, RefreshCw, Trash2, CheckCircle2, Power, Archive, XCircle, Loader2, CalendarPlus } from 'lucide-react';
import { useAcademicYears } from '../hooks/useAcademicYears';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { AcademicYearSummaryApi, CreateAcademicYearPayload, AddAcademicTermPayload } from '../types';

const CURRENT_USER = 'admin';

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function AcademicYearsScreen() {
  const {
    years,
    isLoading,
    actionLoading,
    error,
    fetchYears,
    create,
    createWithTerms,
    addTerm,
    runLifecycle,
    remove,
  } = useAcademicYears();

  const [showCreate, setShowCreate] = useState(false);
  const [showAddTerm, setShowAddTerm] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYearSummaryApi | null>(null);

  // Create form state
  const [form, setForm] = useState<CreateAcademicYearPayload>({
    id: '',
    code: '',
    schoolScopeId: 'school-al-salam',
    startDate: '',
    endDate: '',
    createdBy: CURRENT_USER,
  });
const [termForms, setTermForms] = useState<AddAcademicTermPayload[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      id: '',
      code: '',
      schoolScopeId: 'school-al-salam',
      startDate: '',
      endDate: '',
      createdBy: CURRENT_USER,
    });
    setTermForms([]);
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!form.id.trim() || !form.code.trim() || !form.startDate || !form.endDate) {
      setFormError('يرجى تعبئة جميع الحقول المطلوبة (المعرف، الكود، تاريخ البدء، تاريخ الانتهاء)');
      return;
    }
    if (form.startDate >= form.endDate) {
      setFormError('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء');
      return;
    }

    if (termForms.length > 0) {
      const res = await createWithTerms(form, termForms);
      if (res.success) setShowCreate(false);
    } else {
      const res = await create(form);
      if (res.success) setShowCreate(false);
    }
  };

  const handleAddTerm = async (yearId: string) => {
    const termForm = termForms[0];
    if (!termForm?.id || !termForm?.code || !termForm?.startDate || !termForm?.endDate) {
      setFormError('يرجى تعبئة بيانات الفصل الدراسي');
      return;
    }
    const res = await addTerm(yearId, termForm);
    if (res.success) {
      setShowAddTerm(null);
      setTermForms([]);
    }
  };

  const lifecycleActions: Array<{ id: string; label: string; icon: React.ReactNode; from: string[] }> = [
    { id: 'approve', label: 'اعتماد', icon: <CheckCircle2 className="w-4 h-4" />, from: ['draft'] },
    { id: 'activate', label: 'تفعيل', icon: <Power className="w-4 h-4" />, from: ['approved'] },
    { id: 'close', label: 'إغلاق', icon: <XCircle className="w-4 h-4" />, from: ['active'] },
    { id: 'archive', label: 'أرشفة', icon: <Archive className="w-4 h-4" />, from: ['closed'] },
  ];

  const availableLifecycle = (year: AcademicYearSummaryApi) =>
    lifecycleActions.filter((a) => a.from.includes(year.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">السنوات الدراسية</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة السنوات الدراسية والفصول مع دورة الحياة الكاملة</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchYears}
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
            سنة دراسية جديدة
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      <SectionCard title="قائمة السنوات الدراسية" subtitle="اضغط على سنة لعرض الفصول وتنفيذ الإجراءات">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin ml-2" />
            جاري التحميل...
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-500 font-medium">لا توجد سنوات دراسية بعد</p>
            <p className="text-slate-400 text-sm mt-1">ابدأ بإنشاء أول سنة دراسية</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-right px-5 py-3 font-bold">الكود</th>
                  <th className="text-right px-5 py-3 font-bold">المعرف</th>
                  <th className="text-center px-5 py-3 font-bold">الفترة</th>
                  <th className="text-center px-5 py-3 font-bold">الفصول</th>
                  <th className="text-center px-5 py-3 font-bold">الحالة</th>
                  <th className="text-center px-5 py-3 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => (
                  <tr key={year.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800">{year.code}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{year.id}</td>
                    <td className="px-5 py-3 text-center text-slate-600">
                      {year.startDate} ← {year.endDate}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        {year.termCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={year.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setShowAddTerm(year.id)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="إضافة فصل"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                        {availableLifecycle(year).map((a) => (
                          <button
                            key={a.id}
                            disabled={actionLoading}
                            onClick={() => runLifecycle(year.id, a.id as never, CURRENT_USER)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                            title={a.label}
                          >
                            {a.icon}
                          </button>
                        ))}
                        <button
                          onClick={() => setDeleteTarget(year)}
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
      </SectionCard>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">إنشاء سنة دراسية جديدة</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="المعرف (ID)">
                  <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="ay-2027-2028" className={inputCls} />
                </Field>
                <Field label="الكود (Code)">
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="2027-2028" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="تاريخ البدء">
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
                </Field>
                <Field label="تاريخ الانتهاء">
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-700">إضافة فصول دراسية</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">العدد:</span>
                    <select
                      value={termForms.length}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setTermForms(Array.from({ length: n }, (_, i) => ({
                          id: `term-${i + 1}-${Date.now()}`,
                          code: i === 0 ? 'F1' : i === 1 ? 'S2' : `T${i + 1}`,
                          startDate: '',
                          endDate: '',
                          changedBy: CURRENT_USER,
                        })));
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-sm"
                    >
                      <option value={0}>بدون</option>
                      <option value={1}>فصل واحد</option>
                      <option value={2}>فصلان</option>
                      <option value={3}>ثلاثة فصول</option>
                    </select>
                  </div>
                </div>
                {termForms.map((term, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 mb-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <input
                      value={term.code}
                      onChange={(e) => setTermForms((prev) => prev.map((t, j) => (j === i ? { ...t, code: e.target.value } : t)))}
                      placeholder="كود الفصل"
                      className={inputCls}
                    />
                    <input
                      value={term.id}
                      onChange={(e) => setTermForms((prev) => prev.map((t, j) => (j === i ? { ...t, id: e.target.value } : t)))}
                      placeholder="معرف الفصل"
                      className={inputCls}
                    />
                    <input
                      type="date"
                      value={term.startDate}
                      onChange={(e) => setTermForms((prev) => prev.map((t, j) => (j === i ? { ...t, startDate: e.target.value } : t)))}
                      className={inputCls}
                    />
                    <input
                      type="date"
                      value={term.endDate}
                      onChange={(e) => setTermForms((prev) => prev.map((t, j) => (j === i ? { ...t, endDate: e.target.value } : t)))}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{formError}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={actionLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  إنشاء السنة الدراسية
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add term modal */}
      {showAddTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">إضافة فصل دراسي</h3>
              <button onClick={() => { setShowAddTerm(null); setTermForms([]); }} className="text-slate-400 hover:text-slate-600 cursor-pointer text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="المعرف (ID)">
                  <input value={termForms[0]?.id ?? ''} onChange={(e) => setTermForms([{ ...(termForms[0] ?? blankTerm()), id: e.target.value }])} placeholder="term-f1" className={inputCls} />
                </Field>
                <Field label="الكود">
                  <input value={termForms[0]?.code ?? ''} onChange={(e) => setTermForms([{ ...(termForms[0] ?? blankTerm()), code: e.target.value }])} placeholder="F1" className={inputCls} />
                </Field>
              </div>
              <Field label="تاريخ البدء">
                <input type="date" value={termForms[0]?.startDate ?? ''} onChange={(e) => setTermForms([{ ...(termForms[0] ?? blankTerm()), startDate: e.target.value }])} className={inputCls} />
              </Field>
              <Field label="تاريخ الانتهاء">
                <input type="date" value={termForms[0]?.endDate ?? ''} onChange={(e) => setTermForms([{ ...(termForms[0] ?? blankTerm()), endDate: e.target.value }])} className={inputCls} />
              </Field>
              {formError && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{formError}</div>}
              <button
                onClick={() => handleAddTerm(showAddTerm)}
                disabled={actionLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                إضافة الفصل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
<ConfirmModal
        isOpen={!!deleteTarget}
        title="حذف السنة الدراسية"
        message={deleteTarget ? `هل أنت متأكد من حذف السنة الدراسية "${deleteTarget.code}"؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
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

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function blankTerm(): AddAcademicTermPayload {
  return { id: '', code: '', startDate: '', endDate: '', changedBy: CURRENT_USER };
}
