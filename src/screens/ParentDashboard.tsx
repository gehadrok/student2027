import React, { useState } from 'react';
import { getRealmDB, getCurrentUser } from '../lib/db';
import { Users, BookOpen, Calendar, DollarSign, Award, UserCheck, Heart, Phone, Mail, Send, ShieldAlert, CheckCircle2, ArrowRight, Clock, FileText } from 'lucide-react';

interface ParentDashboardProps {
  onNavigate: (tab: string) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onNavigate }) => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users?.[3]; // default parent
  const parent = db.parents?.find(p => p.userId === currentUser?.id) || db.parents?.[0];
  const myStudents = parent?.studentIds ? db.students?.filter(s => parent.studentIds.includes(s.id)) || [] : db.students || [];

  const [selectedStuId, setSelectedStuId] = useState(myStudents[0]?.id || "s1");
  const activeStudent = myStudents.find(s => s.id === selectedStuId) || myStudents[0] || db.students?.[0];

  // Stats for active student
  const stuGrades = activeStudent ? db.grades?.filter(g => g.studentId === activeStudent.id) || [] : [];
  const totalMax = stuGrades.reduce((sum, g) => sum + g.maxScore, 0);
  const totalObtained = stuGrades.reduce((sum, g) => sum + g.score, 0);
  const averagePct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 93;

  const stuAtt = activeStudent ? db.attendance?.filter(a => a.studentId === activeStudent.id) || [] : [];
  const presentCount = stuAtt.filter(a => a.status === 'present').length;
  const attPct = stuAtt.length > 0 ? Math.round((presentCount / stuAtt.length) * 100) : 98;

  const stuPayments = activeStudent ? db.payments?.filter(p => p.studentId === activeStudent.id) || [] : [];
  const totalDue = stuPayments.reduce((s, p) => s + (p.remainingAmount || 0), 0);

  const getClassName = (cid?: string) => (cid ? db.classes?.find(c => c.id === cid)?.name || cid : '');
  const getSectionName = (sid?: string) => (sid ? db.sections?.find(sec => sec.id === sid)?.name || sid : '');
  const getSubjectName = (sid?: string) => (sid ? db.subjects?.find(s => s.id === sid)?.name || sid : '');

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Parent Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
            <Users className="w-4 h-4" />
            <span>بوابة أولياء الأمور والمتابعة الأسرية اللحظية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            مرحباً، <span className="text-purple-300">{parent?.name || 'ولي الأمر'}</span> 👨‍👩‍👦
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            رقم الهاتف: <strong className="font-mono text-white">{parent?.phone || '—'}</strong> | عدد الأبناء المسجلين في المدرسة: <strong className="text-white">{myStudents.length} طلاب</strong>
          </p>
        </div>

        {/* Child Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
          {myStudents.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStuId(s.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                selectedStuId === s.id
                  ? 'bg-white text-purple-900 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                {s.name ? s.name.charAt(0) : 'ط'}
              </span>
              <span>{s.name || 'طالب'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Child Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المعدل العام ({activeStudent?.name || 'الطالب'})</span>
            <span className="text-2xl font-black text-blue-600 font-mono">{averagePct}%</span>
            <span className="text-[10px] text-emerald-600 font-bold ml-1">({averagePct >= 90 ? 'متفوق A+' : 'جيد جداً'})</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">مواظبة الحضور والانضباط</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{attPct}%</span>
            <span className="text-[10px] text-slate-400 block">{presentCount} أيام حضور</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">الرسوم والأقساط المتبقية</span>
            <span className={`text-2xl font-black font-mono ${(totalDue || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {(totalDue || 0).toLocaleString()} ر.س
            </span>
            <span className="text-[10px] text-slate-400 block">{totalDue === 0 ? 'الذمة بريئة 🟢' : 'يتطلب السداد'}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المرحلة والشعبة الدراسية</span>
            <span className="text-base font-black text-slate-800 block truncate max-w-[150px]">{getClassName(activeStudent?.classId)}</span>
            <span className="text-xs text-purple-600 font-bold">{getSectionName(activeStudent?.sectionId)}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Child Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Grades & Attendance Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grades Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span>سجل التقييمات والاختبارات الفصلية ({activeStudent?.name || 'الطالب'})</span>
              </h3>
              <button
                onClick={() => onNavigate('grades')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>كشف الدرجات الشامل</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {stuGrades.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">لا توجد درجات مرصودة لهذا الطالب حالياً</p>
              ) : (
                stuGrades.map(g => {
                  const subName = getSubjectName(g.subjectId);
                  const p = Math.round((g.score / g.maxScore) * 100);
                  return (
                    <div key={g.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-800 text-sm block">{subName}</strong>
                        <span className="text-[10px] text-slate-400">{g.type === 'midterm' ? 'اختبار منتصف الفصل' : 'اختبار قصير'} - {g.date}</span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded text-sm">
                          {g.score}/{g.maxScore}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-sans text-center">{p}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Financial Installments Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span>سندات الأقساط والرسوم المدرسية ({activeStudent?.name || 'الطالب'})</span>
              </h3>
              <button
                onClick={() => onNavigate('financial')}
                className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>السجل المالي وإجراء السداد</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {stuPayments.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{p.title}</h4>
                    <span className="text-[11px] text-slate-500 block mt-0.5">تاريخ الاستحقاق: {p.dueDate}</span>
                  </div>
                  <div className="text-left font-mono">
                    <div className="font-bold text-slate-800 text-sm">{(p.amount ?? p.totalAmount ?? 0).toLocaleString()} ر.س</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold block mt-1 text-center font-sans ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                    }`}>
                      {p.status === 'paid' ? 'مسدد بالكامل 🟢' : `متبقي: ${(p.remainingAmount || 0).toLocaleString()} ر.س`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Administration Contact & Health Notes */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-600" />
              <span>التواصل السريع مع إدارة المدرسة</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-900">
                <span className="font-bold block mb-1">المرشد الطلابي لشعبة الابن:</span>
                <p className="text-slate-600 mb-2">أ. خالد السديري (متواجد يومياً 8 ص - 1 م)</p>
                <button
                  onClick={() => alert("تم فتح قناة تواصل مباشرة عبر نظام الرسائل المدرسة.")}
                  className="w-full py-2 rounded-lg bg-purple-600 text-white font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال رسالة للمرشد</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span>هاتف الإدارة العامة:</span>
                  <strong className="font-mono text-slate-800">011-4567890</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>بريد شؤون الطلاب:</span>
                  <strong className="font-mono text-slate-800">info@alsalam.edu.sa</strong>
                </div>
              </div>
            </div>
          </div>

          {activeStudent.healthNotes && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <Heart className="w-5 h-5 text-red-500" />
                <span>الملف الصحي للمدرسة</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                تنبيه مسجل في ملف ابنكم: <strong className="text-red-700">{activeStudent.healthNotes}</strong>. تحرص المدرسة دائماً على مراعاة كافة الاشتراطات الصحية لسلامته.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
