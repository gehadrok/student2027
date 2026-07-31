import React, { useState } from 'react';
import { Teacher } from '../types';
import { getRealmDB, addAuditLog } from '../lib/db';
import { 
  GraduationCap, BookOpen, Building2, Calendar, Clock, DollarSign, 
  FileText, Star, Award, User, Phone, Mail, MapPin, CheckCircle2, 
  AlertCircle, X, Printer, Plus, Download, ShieldCheck, Briefcase, ArrowRight
} from 'lucide-react';
import { UnifiedPrintLayout } from './UnifiedPrintLayout';

export interface TeacherProfileDashboardProps {
  teacher: Teacher;
  onClose: () => void;
  onEdit?: (teacher: Teacher) => void;
}

export type TeacherDashboardTab = 
  | 'personal'
  | 'subjects'
  | 'classes'
  | 'schedule'
  | 'attendance'
  | 'salary'
  | 'leaves'
  | 'evaluation'
  | 'documents';

export const TeacherProfileDashboard: React.FC<TeacherProfileDashboardProps> = ({
  teacher,
  onClose,
  onEdit
}) => {
  const db = getRealmDB();
  const [activeTab, setActiveTab] = useState<TeacherDashboardTab>('personal');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Derived datasets
  const taughtSubjects = db.subjects.filter(s => s.teacherId === teacher.id || teacher.subjectIds?.includes(s.id));
  const assignedClasses = db.classes.filter(c => teacher.classIds?.includes(c.id));
  const schedulePeriods = db.schedule?.filter(sp => sp.teacherId === teacher.id) || [];

  // Computed metrics
  const totalWeeklyHours = taughtSubjects.reduce((acc, curr) => acc + (curr.weeklyHours || 4), 0) || 18;
  const baseSalary = 350000; // YER / SAR equivalent
  const allowanceAmount = 45000;
  const netSalary = baseSalary + allowanceAmount;

  const tabs: { id: TeacherDashboardTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'personal', label: 'البيانات الشخصية', icon: <User className="w-4 h-4 text-emerald-600" /> },
    { id: 'subjects', label: 'المواد المقررة', icon: <BookOpen className="w-4 h-4 text-blue-600" />, badge: taughtSubjects.length },
    { id: 'classes', label: 'الفصول والشعب', icon: <Building2 className="w-4 h-4 text-teal-600" />, badge: assignedClasses.length },
    { id: 'schedule', label: 'الجدول الأسبوعي', icon: <Clock className="w-4 h-4 text-amber-600" />, badge: `${totalWeeklyHours} حصة` },
    { id: 'attendance', label: 'الحضور والانضباط', icon: <Calendar className="w-4 h-4 text-purple-600" />, badge: '98%' },
    { id: 'salary', label: 'الراتب المستحق', icon: <DollarSign className="w-4 h-4 text-emerald-700" /> },
    { id: 'leaves', label: 'سجل الإجازات', icon: <Briefcase className="w-4 h-4 text-orange-600" />, badge: '3 أيام' },
    { id: 'evaluation', label: 'التقييم والأداء', icon: <Star className="w-4 h-4 text-yellow-500" />, badge: '96%' },
    { id: 'documents', label: 'المستندات والوثائق', icon: <FileText className="w-4 h-4 text-indigo-600" />, badge: 4 },
  ];

  const days: ('الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس')[] = [
    'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP HEADER BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white p-6 md:p-8 relative shrink-0">
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer border border-white/15 flex items-center gap-1.5 shadow-xs"
              title="الرجوع إلى قائمة المعلمين"
            >
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              <span>الرجوع إلى القائمة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/15"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Teacher Avatar & Basic Info */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-black text-3xl flex items-center justify-center shadow-xl shadow-emerald-500/30 border-2 border-white/20 shrink-0">
                {teacher.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">{teacher.name}</h2>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold text-xs">
                    {teacher.specialization}
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-white/10 text-white font-mono text-xs font-bold">
                    {teacher.id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-bold">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                    المؤهل: {teacher.qualification || 'بكالوريوس تربوي'}
                  </span>
                  <span>•</span>
                  <span>سنوات الخبرة: {teacher.experienceYears} سنوات</span>
                  <span>•</span>
                  <span>الحالة: {teacher.status === 'active' ? 'على رأس العمل 🟢' : 'في إجازة 🟡'}</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              {onEdit && (
                <button
                  onClick={() => onEdit(teacher)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>تعديل الملف</span>
                </button>
              )}
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة البيان الإداري</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-200 font-bold">نصاب الحصص الأسبوعية</p>
                <p className="text-lg font-black text-amber-300 font-mono">{totalWeeklyHours} حصة</p>
              </div>
              <Clock className="w-6 h-6 text-amber-400 opacity-80" />
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-200 font-bold">المواد المكلف بها</p>
                <p className="text-lg font-black text-white font-mono">{taughtSubjects.length} مواد</p>
              </div>
              <BookOpen className="w-6 h-6 text-white opacity-80" />
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-200 font-bold">تقييم الأداء السنوي</p>
                <p className="text-lg font-black text-emerald-300 font-mono">96% (ممتاز)</p>
              </div>
              <Star className="w-6 h-6 text-emerald-400 opacity-80" />
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-200 font-bold">صافي الراتب المستحق</p>
                <p className="text-lg font-black text-sky-300 font-mono">{netSalary.toLocaleString()} ر.س</p>
              </div>
              <DollarSign className="w-6 h-6 text-sky-400 opacity-80" />
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS BAR (9 TABS) */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 shrink-0 overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-md border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* TAB BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">

          {/* 1. PERSONAL INFO TAB */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600" />
                  البيانات الشخصية والمهنية للمعلم
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">الاسم الكامل</span>
                    <span className="font-bold text-slate-900 text-sm block">{teacher.name}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">التخصص الأكاديمي</span>
                    <span className="font-bold text-emerald-700 text-sm block">{teacher.specialization}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">المؤهل العلمي</span>
                    <span className="font-bold text-slate-900 text-sm block">{teacher.qualification}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">البريد الإلكتروني</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block">{teacher.email}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">رقم الجوال</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block" dir="ltr">{teacher.phone}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">سنوات الخبرة التدريسية</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block">{teacher.experienceYears} سنوات</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">الحالة الوظيفية: مثبت على كادر التعليم العام (دوام كامل)</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">نشط 🟢</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. SUBJECTS TAB */}
          {activeTab === 'subjects' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    المواد والمناهج الدراسية الموكلة للمعلم
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-bold text-xs">
                    إجمالي المواد: {taughtSubjects.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-3 px-4">رمز المادة</th>
                        <th className="py-3 px-4">اسم المادة الدراسية</th>
                        <th className="py-3 px-4 text-center">الحصص الأسبوعية</th>
                        <th className="py-3 px-4 text-center">الدرجة العظمى</th>
                        <th className="py-3 px-4 text-center">درجة النجاح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {taughtSubjects.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono text-slate-500">{sub.code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">{sub.weeklyHours} حصص</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-700">{sub.maxScore}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">{sub.passScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. CLASSES TAB */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  الفصول والشعب التي يُدرّسها المعلم
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedClasses.map(cls => (
                    <div key={cls.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-sm">{cls.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                          {cls.sections.length} شعب دراسية
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        الشعب المخصصة: {cls.sections.map(s => s.name).join('، ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  جدول الحصص الأسبوعي والمعاينة الفترية
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border border-slate-200">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-2.5 px-3 border border-slate-700">اليوم / الحصة</th>
                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                          <th key={p} className="py-2.5 px-2 border border-slate-700">الحصة {p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {days.map(d => (
                        <tr key={d} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-bold bg-slate-100 border border-slate-200 text-slate-900">{d}</td>
                          {[1, 2, 3, 4, 5, 6, 7].map(p => {
                            const match = schedulePeriods.find(sp => sp.day === d && sp.periodNumber === p);
                            const subName = match ? db.subjects.find(s => s.id === match.subjectId)?.name : null;
                            const clsName = match ? db.classes.find(c => c.id === match.classId)?.name : null;
                            return (
                              <td key={p} className="p-2 border border-slate-200 text-[11px]">
                                {match ? (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5 text-emerald-900">
                                    <p className="font-black truncate">{subName || 'مادة'}</p>
                                    <span className="text-[9px] text-emerald-700 block">{clsName || 'فصل'}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  سجل انضباط وحضور المعلم
                </h3>

                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-purple-900 block">نسبة الالتزام بدوام الحضور: 98%</span>
                    <p className="text-purple-700">سجل البصمة الإلكترونية منتظم بدون تأخيرات غير مبررة.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">ملف ممتاز 🟢</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. SALARY TAB */}
          {activeTab === 'salary' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                  سجل الاستحقاقات المالية والراتب الشهرى
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-bold block">الراتب الأساسي</span>
                    <span className="font-mono font-black text-slate-900 text-sm block">{baseSalary.toLocaleString()} ر.س</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-500 font-bold block">البدلات والمكافآت</span>
                    <span className="font-mono font-black text-emerald-700 text-sm block">+{allowanceAmount.toLocaleString()} ر.س</span>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                    <span className="text-emerald-900 font-bold block">إجمالي صافي الراتب المستحق</span>
                    <span className="font-mono font-black text-emerald-800 text-base block">{netSalary.toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. LEAVES TAB */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-orange-600" />
                  رصيد الإجازات والغياب بعذر
                </h3>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">إجازة اعتيادية سنوية</span>
                    <span className="font-mono text-emerald-700 font-bold">المستخدم: 3 أيام | المتبقي: 27 يوماً</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. EVALUATION TAB */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  تقييم الأداء والتميز التربوي
                </h3>

                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-900 text-sm">تقييم الإدارة العامة: 96% (ممتاز جداً)</span>
                    <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-bold">عام 2026</span>
                  </div>
                  <p className="text-amber-900 leading-relaxed font-medium">
                    يتميز المعلم بالانضباط العالي في إعداد الخطط الدراسية واستخدام الوسائل التعليمية الحديثة والتفاعل الإيجابي مع الطلاب.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 9. DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  المستندات والعقود الوظيفية
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'عقد التعيين الوظيفي المعتمد', date: '2023-09-01', size: '2.8 MB' },
                    { name: 'شهادة البكالوريوس والمؤهل التربوي', date: '2023-09-01', size: '1.5 MB' },
                    { name: 'رخصة الممارسة والتصنيف المهني', date: '2024-01-15', size: '920 KB' },
                    { name: 'شهادة دورة التكنولوجيا في التعليم', date: '2025-05-10', size: '1.1 MB' },
                  ].map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900">{doc.name}</p>
                          <span className="text-[10px] text-slate-400">{doc.date} • {doc.size}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-all flex items-center gap-1 cursor-pointer">
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>تحميل</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900">طباعة البيانية الإدارية للمعلم</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </div>

            <div className="border border-slate-300 p-6 rounded-2xl bg-white">
              <UnifiedPrintLayout
                reportTitle={`التقرير الوظيفي والإداري للمعلم: ${teacher.name}`}
                reportSubtitle={`التخصص: ${teacher.specialization} | الخبرة: ${teacher.experienceYears} سنوات`}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div><strong>الاسم:</strong> {teacher.name}</div>
                    <div><strong>التخصص:</strong> {teacher.specialization}</div>
                    <div><strong>المؤهل:</strong> {teacher.qualification}</div>
                    <div><strong>البريد:</strong> {teacher.email}</div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 pt-2 border-b pb-1">المواد المقررة</h4>
                  <ul className="list-disc pr-4 space-y-1">
                    {taughtSubjects.map(s => (
                      <li key={s.id}>{s.name} ({s.weeklyHours} حصص)</li>
                    ))}
                  </ul>
                </div>
              </UnifiedPrintLayout>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfileDashboard;
