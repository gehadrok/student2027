import React, { useState } from 'react';
import { FinancialPayment, PaymentStatus, AppNotification } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog, getCurrentUser } from '../lib/db';
import { DollarSign, Plus, CheckCircle2, AlertCircle, Clock, Search, FileText, TrendingUp, CreditCard, Send, ShieldAlert } from 'lucide-react';

export const FinancialScreen: React.FC = () => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users[0];
  const [payments, setPayments] = useState<FinancialPayment[]>(db.payments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [formStudentId, setFormStudentId] = useState(db.students[0]?.id || 's1');
  const [formTitle, setFormTitle] = useState('القسط الدراسي الأول 2026');
  const [formTotal, setFormTotal] = useState(4500);
  const [formPaid, setFormPaid] = useState(4500);
  const [formDueDate, setFormDueDate] = useState('2026-08-01');
  const [formStatus, setFormStatus] = useState<PaymentStatus>('paid');

  // Summary Metrics
  const totalRevenueExpected = payments.reduce((sum, p) => sum + (p.amount ?? p.totalAmount ?? 0), 0);
  const totalCollected = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalOverdueDebt = payments.reduce((sum, p) => sum + (p.remainingAmount || 0), 0);

  const filteredPayments = payments.filter(p => {
    if (currentUser.role === 'parent') {
      const parent = db.parents.find(x => x.userId === currentUser.id);
      if (parent && !parent.studentIds.includes(p.studentId)) return false;
    }
    const stuName = getStudentName(p.studentId);
    const matchesSearch = stuName.toLowerCase().includes(search.toLowerCase()) || p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setFormStudentId(db.students[0]?.id || 's1');
    setFormTitle('القسط الدراسي الثاني (الفصل الربيعي)');
    setFormTotal(4500);
    setFormPaid(0);
    setFormDueDate('2026-10-15');
    setFormStatus('unpaid');
    setShowModal(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const newDb = getRealmDB();
    const remaining = Math.max(0, Number(formTotal) - Number(formPaid));
    const st: PaymentStatus = remaining === 0 ? 'paid' : Number(formPaid) > 0 ? 'partial' : 'unpaid';

    const newP: FinancialPayment = {
      id: `pay_${Date.now()}`,
      studentId: formStudentId,
      title: formTitle,
      totalAmount: Number(formTotal),
      amount: Number(formTotal),
      paidAmount: Number(formPaid),
      remainingAmount: remaining,
      dueDate: formDueDate,
      status: st,
      paymentMethod: remaining === 0 ? 'بطاقة مدى / حوالة بنكية' : undefined
    };
    newDb.payments.unshift(newP);

    // Send notification to parent
    const stu = newDb.students.find(s => s.id === formStudentId);
    if (stu) {
      const notif: AppNotification = {
        id: `notif_pay_${Date.now()}`,
        userId: stu.parentId === "p1" ? "u4" : undefined,
        title: st === 'paid' ? `إيصال سداد إلكتروني: ${stu.name}` : `إشعار استحقاق رسوم مالية: ${stu.name}`,
        message: st === 'paid'
          ? `تم استلام مبلغ ${formPaid.toLocaleString()} ر.س لسداد (${formTitle}). شكراً لتعاونكم.`
          : `تم إصدار فاتورة جديدة (${formTitle}) بقيمة ${formTotal.toLocaleString()} ر.س واستحقاق ${formDueDate}.`,
        type: st === 'paid' ? 'success' : 'warning',
        isRead: false,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      newDb.notifications.unshift(notif);
    }

    saveRealmDB(newDb);
    setPayments(newDb.payments);
    addAuditLog("إصدار فاتورة / سند قبض", `تم تسجيل دفعة مالية بقيمة ${formPaid} ر.س للطالب ${stu?.name || formStudentId}`);
    setShowModal(false);
  };

  const handleQuickPay = (pId: string) => {
    if (currentUser.role !== 'admin') return;
    const newDb = getRealmDB();
    const idx = newDb.payments.findIndex(x => x.id === pId);
    if (idx !== -1) {
      const p = newDb.payments[idx];
      p.paidAmount = p.amount;
      p.remainingAmount = 0;
      p.status = 'paid';
      p.paymentMethod = 'سداد فوري إلكتروني (ApplePay / Mada)';

      // Trigger receipt alert
      const stu = newDb.students.find(s => s.id === p.studentId);
      if (stu) {
        newDb.notifications.unshift({
          id: `notif_rec_${Date.now()}`,
          userId: stu.parentId === "p1" ? "u4" : undefined,
          title: `إيصال سداد سند رقم (${p.id.slice(-4)}): ${stu.name}`,
          message: `تم سداد المبلغ المتبقي بالكامل (${(p.amount ?? p.totalAmount ?? 0).toLocaleString()} ر.س) للبند (${p.title}). حساب الطالب بريء الذمة.`,
          type: 'success',
          isRead: false,
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
      }
    }
    saveRealmDB(newDb);
    setPayments([...newDb.payments]);
    addAuditLog("تسديد سند مالي فوري", `تم إقفال القسط رقم ${pId} بالكامل`);
  };

  function getStudentName(sid: string) {
    return db.students.find(s => s.id === sid)?.name || sid;
  }

  function getAcademicId(sid: string) {
    return db.students.find(s => s.id === sid)?.academicId || sid;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">إدارة الشؤون المالية والأقساط الدراسية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة الرسوم، إصدار سندات القبض، رصد المتأخرات، وإرسال إشعارات الفواتير اللحظية
            </p>
          </div>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار فاتورة / سند قسط</span>
          </button>
        )}
      </div>

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">إجمالي الأقساط المستحقة</span>
            <span className="text-xl font-black text-slate-800 font-mono">{(totalRevenueExpected || 0).toLocaleString()} ر.س</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المبالغ المحصلة (سندات مقفلة)</span>
            <span className="text-xl font-black text-emerald-600 font-mono">{(totalCollected || 0).toLocaleString()} ر.س</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المتأخرات والمديونية القائمة</span>
            <span className="text-xl font-black text-red-600 font-mono">{(totalOverdueDebt || 0).toLocaleString()} ر.س</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب أو عنوان الفاتورة..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="all">كافة الحالات</option>
            <option value="paid">مسدد بالكامل 🟢</option>
            <option value="overdue">متأخر السداد 🔴</option>
            <option value="partial">سداد جزئي 🟡</option>
            <option value="unpaid">غير مسدد ⚪</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم السند والطالب</th>
                <th className="py-3 px-4">بيان الرسوم / القسط</th>
                <th className="py-3 px-4 text-center">إجمالي المبلغ</th>
                <th className="py-3 px-4 text-center">المدفوع والمتبقي</th>
                <th className="py-3 px-4 text-center">تاريخ الاستحقاق</th>
                <th className="py-3 px-4 text-center">حالة السداد</th>
                {currentUser.role === 'admin' && <th className="py-3 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">لا توجد حركات أو سندات مالية مطابقة للبحث</td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 text-sm">{getStudentName(p.studentId)}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{getAcademicId(p.studentId)} | {p.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-700">{p.title}</p>
                      {p.paymentMethod && <span className="text-[10px] text-blue-600 font-semibold">{p.paymentMethod}</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-slate-800 text-sm">
                      {(p.amount ?? p.totalAmount ?? 0).toLocaleString()} ر.س
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-mono">
                        <span className="text-emerald-700 font-bold">{(p.paidAmount || 0).toLocaleString()}</span>
                        <span className="text-slate-400"> / </span>
                        <span className={(p.remainingAmount || 0) > 0 ? "text-red-600 font-bold" : "text-slate-400"}>
                          متبقي: {(p.remainingAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                      {p.dueDate}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                        p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'overdue' ? 'bg-red-100 text-red-800 animate-pulse' :
                        p.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.status === 'paid' ? 'مسدد بالكامل 🟢' :
                         p.status === 'overdue' ? 'متأخر السداد 🔴' :
                         p.status === 'partial' ? 'سداد جزئي 🟡' : 'غير مسدد ⚪'}
                      </span>
                    </td>
                    {currentUser.role === 'admin' && (
                      <td className="py-3 px-4 text-center">
                        {p.status !== 'paid' ? (
                          <button
                            onClick={() => handleQuickPay(p.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                          >
                            سداد كامل الآن 💳
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">بريء الذمة</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Invoice */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">إصدار فاتورة / سند قسط دراسي</h3>
            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اختر الطالب</label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {db.students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicId})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">بيان القسط / الرسوم</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: رسوم الكتب والحافلة المدرسية"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">إجمالي المبلغ (ر.س)</label>
                  <input
                    type="number"
                    required
                    value={formTotal}
                    onChange={(e) => setFormTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدفعة المقدمة / المسددة</label>
                  <input
                    type="number"
                    required
                    value={formPaid}
                    onChange={(e) => setFormPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الاستحقاق الأقصى</label>
                <input
                  type="date"
                  required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">إصدار السند وإرسال إشعار ولي الأمر</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
