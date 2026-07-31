import React, { useState } from 'react';
import { Student } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog } from '../lib/db';
import { 
  User, Users, Calendar, Award, DollarSign, ShieldAlert, FileText, 
  FileCheck, MessageSquare, Activity, CheckCircle2, AlertCircle, Phone, 
  Mail, MapPin, Heart, BookOpen, Clock, Download, Plus, Star, Sparkles, 
  X, Printer, GraduationCap, Building2, Eye, ShieldCheck, ArrowRight
} from 'lucide-react';
import { UnifiedPrintLayout } from './UnifiedPrintLayout';

export interface StudentProfileDashboardProps {
  student: Student;
  onClose: () => void;
  onEdit?: (student: Student) => void;
}

export type StudentDashboardTab = 
  | 'personal'
  | 'guardian'
  | 'attendance'
  | 'grades'
  | 'fees'
  | 'behavior'
  | 'documents'
  | 'certificates'
  | 'notes'
  | 'activities';

export const StudentProfileDashboard: React.FC<StudentProfileDashboardProps> = ({
  student,
  onClose,
  onEdit,
}) => {
  const db = getRealmDB();
  const [activeTab, setActiveTab] = useState<StudentDashboardTab>('personal');
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // Custom states for interactive elements in tabs
  const [newNoteText, setNewNoteText] = useState('');
  const [studentNotes, setStudentNotes] = useState<{ id: string; date: string; author: string; text: string; category: string }[]>([
    { id: '1', date: '2026-02-10', author: 'أ. أحمد علي (مرشد طلابي)', text: 'يظهر الطالب تحسناً كبيراً في الرياضيات والمشاركة الصفية الفعالة.', category: 'إرشادي' },
    { id: '2', date: '2026-01-15', author: 'د. سارة محمود (الطبيبة المدرسية)', text: 'تم إجراء الفحص الدوري للعينين والنظر ممتاز مع التوصية بالجلوس في الصف الأول.', category: 'صحي' }
  ]);

  const schoolClass = db.classes.find(c => c.id === student.classId);
  const section = db.sections.find(s => s.id === student.sectionId);
  const parent = db.parents.find(p => p.id === student.parentId || p.name === student.parentName);

  const studentGrades = db.grades.filter(g => g.studentId === student.id);
  const studentAttendance = db.attendance.filter(a => a.studentId === student.id);
  const studentPayments = db.payments.filter(p => p.studentId === student.id);
  const studentCerts = db.certificates.filter(c => c.studentId === student.id);
  const studentBorrows = db.borrowings.filter(b => b.studentId === student.id);

  // Computed metrics
  const totalPresent = studentAttendance.filter(a => a.status === 'present').length;
  const totalAbsent = studentAttendance.filter(a => a.status === 'absent').length;
  const totalLate = studentAttendance.filter(a => a.status === 'late').length;
  const totalExcused = studentAttendance.filter(a => a.status === 'excused').length;
  const totalDays = studentAttendance.length || 1;
  const attendanceRate = Math.round((totalPresent / totalDays) * 100) || 98;

  const totalPaid = studentPayments.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
  const totalRemaining = studentPayments.reduce((acc, curr) => acc + (curr.remainingAmount || 0), 0);

  const avgGrade = studentGrades.length 
    ? Math.round(studentGrades.reduce((acc, curr) => acc + (curr.score / curr.maxScore) * 100, 0) / studentGrades.length) 
    : 92;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setStudentNotes([
      {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        author: 'إدارة النظام',
        text: newNoteText,
        category: 'عام'
      },
      ...studentNotes
    ]);
    setNewNoteText('');
    addAuditLog('إضافة ملاحظة طالب', `تم إضافة ملاحظة جديدة للطالب (${student.name})`);
  };

  const tabs: { id: StudentDashboardTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'personal', label: 'البيانات الشخصية', icon: <User className="w-4 h-4 text-blue-600" /> },
    { id: 'guardian', label: 'ولي الأمر', icon: <Users className="w-4 h-4 text-indigo-600" /> },
    { id: 'attendance', label: 'الحضور والغياب', icon: <Calendar className="w-4 h-4 text-emerald-600" />, badge: `${attendanceRate}%` },
    { id: 'grades', label: 'الدرجات والنتائج', icon: <Award className="w-4 h-4 text-rose-600" />, badge: studentGrades.length },
    { id: 'fees', label: 'الرسوم والماليات', icon: <DollarSign className="w-4 h-4 text-amber-600" /> },
    { id: 'behavior', label: 'السلوك والانضباط', icon: <ShieldAlert className="w-4 h-4 text-purple-600" /> },
    { id: 'documents', label: 'الوثائق والمرفقات', icon: <FileText className="w-4 h-4 text-teal-600" />, badge: 4 },
    { id: 'certificates', label: 'الشهادات والتكريم', icon: <FileCheck className="w-4 h-4 text-sky-600" />, badge: studentCerts.length },
    { id: 'notes', label: 'الملاحظات والإرشاد', icon: <MessageSquare className="w-4 h-4 text-cyan-600" />, badge: studentNotes.length },
    { id: 'activities', label: 'النشاط والفعاليات', icon: <Activity className="w-4 h-4 text-orange-600" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP HEADER BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 md:p-8 relative shrink-0">
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer border border-white/15 flex items-center gap-1.5 shadow-xs"
              title="الرجوع إلى قائمة الطلاب"
            >
              <ArrowRight className="w-4 h-4 text-amber-400" />
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
            {/* Student Avatar & Basic Info */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-xl shadow-blue-500/30 border-2 border-white/20 shrink-0">
                {student.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">{student.name}</h2>
                  <span className="px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 font-mono font-bold text-xs">
                    {student.academicId}
                  </span>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                    student.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {student.status === 'active' ? 'منتظم دراسياً 🟢' : student.status === 'at-risk' ? 'متعثر أفقياً 🔴' : 'منقول'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    {schoolClass?.name || 'الصف الأول الثانوي'} - {section?.name || 'شعبة أ'}
                  </span>
                  <span>•</span>
                  <span>تاريخ الالتحاق: {student.enrollmentDate || '2025-09-01'}</span>
                  <span>•</span>
                  <span>الجنس: {student.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              {onEdit && (
                <button
                  onClick={() => onEdit(student)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span>تعديل البيانات</span>
                </button>
              )}
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الملف الشامل</span>
              </button>
            </div>
          </div>

          {/* KPI Mini Badges Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-200 font-bold">نسبة الحضور السنوي</p>
                <p className="text-lg font-black text-emerald-300 font-mono">{attendanceRate}%</p>
              </div>
              <Calendar className="w-6 h-6 text-emerald-400 opacity-80" />
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-200 font-bold">المعدل العام التقديري</p>
                <p className="text-lg font-black text-amber-300 font-mono">{avgGrade}%</p>
              </div>
              <Award className="w-6 h-6 text-amber-400 opacity-80" />
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-200 font-bold">المتبقي من الرسوم</p>
                <p className="text-lg font-black text-white font-mono">{totalRemaining.toLocaleString()} ر.س</p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-300 opacity-80" />
            </div>

            <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-200 font-bold">الشهادات المعتمدة</p>
                <p className="text-lg font-black text-sky-300 font-mono">{studentCerts.length || 2}</p>
              </div>
              <FileCheck className="w-6 h-6 text-sky-400 opacity-80" />
            </div>
          </div>
        </div>

        {/* HORIZONTAL TABS NAVIGATION BAR (10 TABS) */}
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
                  <User className="w-5 h-5 text-blue-600" />
                  البيانات الشخصية والأكاديمية للطالب
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">الاسم الرباعي الكامل</span>
                    <span className="font-bold text-slate-900 text-sm block">{student.name}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">الرقم الأكاديمي الموحد</span>
                    <span className="font-mono font-bold text-blue-700 text-sm block">{student.academicId}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">الصف والشعبة</span>
                    <span className="font-bold text-slate-900 text-sm block">{schoolClass?.name} ({section?.name})</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">تاريخ الميلاد</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block">{student.birthDate || '2008-05-14'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">الجنسية والنوع</span>
                    <span className="font-bold text-slate-800 text-xs block">يمني - {student.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-semibold block">تاريخ التسجيل والالتحاق</span>
                    <span className="font-mono font-bold text-slate-800 text-xs block">{student.enrollmentDate || '2025-09-01'}</span>
                  </div>
                </div>

                {/* Additional Health & Emergency details */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-red-500" />
                    السجل الصحي والطبي للطالب
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    {student.healthNotes || 'لا توجد ملاحظات صحية حرجة مسجلة. الفحص الطبي السنوي سليم بدون حساسية مزمنة.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. GUARDIAN TAB */}
          {activeTab === 'guardian' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    بيانات ولي الأمر وسجل التواصل
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                    علاقة القرابة: الأب / الحاضن القانوني
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 font-semibold">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>اسم ولي الأمر:</span>
                    </div>
                    <span className="font-black text-slate-900 text-sm block">{student.parentName}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 font-semibold">
                      <Phone className="w-4 h-4 text-indigo-600" />
                      <span>رقم الهاتف الأساسي:</span>
                    </div>
                    <span className="font-mono font-black text-slate-900 text-sm block" dir="ltr">{student.parentPhone}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 font-semibold">
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <span>البريد الإلكتروني للتواصل:</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 text-xs block">{parent?.email || `${student.academicId.toLowerCase()}@parent.edu.ye`}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 font-semibold">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span>عنوان السكن الدائم:</span>
                    </div>
                    <span className="font-bold text-slate-800 text-xs block">الضالع - جحاف - الحي الرئيسي</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-indigo-900 block">إشعارات الرسائل النصية القصيرة (SMS)</span>
                    <p className="text-slate-600">الحساب مفعل لاستلام الإشعارات الفورية عن الحضور والغياب وكشوف الدرجات.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">مُدرَج بالأرشيف 🟢</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    سجل مواظبة الحضور والغياب التفصيلي
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">حاضر: {totalPresent}</span>
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-xs">غائب: {totalAbsent}</span>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">متأخر: {totalLate}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>نسبة الانتظام الأكاديمي</span>
                    <span className="font-mono text-emerald-700">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full" style={{ width: `${attendanceRate}%` }} />
                  </div>
                </div>

                {/* Attendance Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-3 px-4">التاريخ</th>
                        <th className="py-3 px-4">اليوم</th>
                        <th className="py-3 px-4 text-center">حالة الحضور</th>
                        <th className="py-3 px-4">مسجل الحالة</th>
                        <th className="py-3 px-4">ملاحظات / أعذار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentAttendance.length > 0 ? (
                        studentAttendance.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{rec.date}</td>
                            <td className="py-3 px-4 text-slate-600">يومي</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                rec.status === 'present' ? 'bg-emerald-100 text-emerald-800' : rec.status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {rec.status === 'present' ? 'حاضر 🟢' : rec.status === 'absent' ? 'غائب 🔴' : 'متأخر 🟡'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{rec.recordedBy || 'معلم الفصل'}</td>
                            <td className="py-3 px-4 text-slate-500">{rec.notes || '—'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                            سجل الحضور منتظم بنسبة 100% بدون غيابات مرصودة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. GRADES TAB */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-rose-600" />
                    كشف الدرجات والنتائج الإجمالية
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-black font-mono text-xs">
                    المعدل الإجمالي: {avgGrade}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-3 px-4">المادة المقررة</th>
                        <th className="py-3 px-4">نوع الاختبار</th>
                        <th className="py-3 px-4 text-center">الدرجة المحصلة</th>
                        <th className="py-3 px-4 text-center">الدرجة العظمى</th>
                        <th className="py-3 px-4 text-center">النسبة المئوية</th>
                        <th className="py-3 px-4">تاريخ الرصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentGrades.length > 0 ? (
                        studentGrades.map((g) => {
                          const subName = db.subjects.find(s => s.id === g.subjectId)?.name || 'مادة علمية';
                          const pct = Math.round((g.score / g.maxScore) * 100);
                          return (
                            <tr key={g.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-bold text-slate-900">{subName}</td>
                              <td className="py-3 px-4 text-slate-600">{g.type === 'midterm' ? 'منتصف الفصل' : g.type === 'final' ? 'الاختبار النهائي' : 'اختبار قصير'}</td>
                              <td className="py-3 px-4 text-center font-mono font-black text-blue-700">{g.score}</td>
                              <td className="py-3 px-4 text-center font-mono text-slate-500">{g.maxScore}</td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">{pct}%</td>
                              <td className="py-3 px-4 font-mono text-slate-500">{g.date}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                            لم يتم إدخال نتائج اختبارات بعد في الفترة الحالية
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. FEES TAB */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    السجل المالي والأقساط الدراسية
                  </h3>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">المدفوع: {totalPaid.toLocaleString()} ر.س</span>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">المتبقي: {totalRemaining.toLocaleString()} ر.س</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-3 px-4">رقم السند</th>
                        <th className="py-3 px-4">بيان القسط الدراسي</th>
                        <th className="py-3 px-4 text-center">المبلغ المستحق</th>
                        <th className="py-3 px-4 text-center">المبلغ المدفوع</th>
                        <th className="py-3 px-4 text-center">المتبقي</th>
                        <th className="py-3 px-4 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {studentPayments.length > 0 ? (
                        studentPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-slate-500">{p.receiptNumber || 'REC-101'}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{p.title}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{(p.totalAmount || p.amount || 0).toLocaleString()} ر.س</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">{(p.paidAmount || 0).toLocaleString()} ر.س</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">{(p.remainingAmount || 0).toLocaleString()} ر.س</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.status === 'paid' ? 'مسدد بالكامل 🟢' : 'قسط متبقي 🟡'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                            لا توجد رسوم مالية متأخرة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. BEHAVIOR TAB */}
          {activeTab === 'behavior' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-purple-600" />
                    سجل السلوك والانضباط المدرسي
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                    درجة السلوك: 100 / 100 (ممتاز)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-emerald-600" />
                      النقاط الإيجابية والإشادات
                    </span>
                    <ul className="text-xs text-emerald-900 space-y-1 list-disc pr-4">
                      <li>التزام تام بالزي المدرسي الموحد والانتظام النمطي.</li>
                      <li>مشاركة ممتازة في الأنشطة الطلابية والرياضية.</li>
                      <li>مساعدة الزملاء في الصف والتفاعل الملموس.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-slate-600" />
                      المخالفات أو الإنذارات
                    </span>
                    <p className="text-xs text-slate-500 italic">
                      لا توجد مخافات سلوكية أو إنذارات موثقة في ملف الطالب.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  أرشيف الوثائق والمستندات الرقمية
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'شهادة الميلاد الرسمية', date: '2025-09-01', size: '1.2 MB', status: 'مكتمل' },
                    { name: 'صورة الهوية الوطنية / كارت العائلة', date: '2025-09-01', size: '2.4 MB', status: 'مكتمل' },
                    { name: 'الفحص الطبي وسجل اللقاحات', date: '2025-09-02', size: '850 KB', status: 'مكتمل' },
                    { name: 'استمارة التسجيل والتعهد المدرسي', date: '2025-09-01', size: '1.1 MB', status: 'مكتمل' },
                  ].map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-600 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900">{doc.name}</p>
                          <span className="text-[10px] text-slate-400">{doc.date} • {doc.size}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-all flex items-center gap-1 cursor-pointer">
                        <Download className="w-3.5 h-3.5 text-teal-600" />
                        <span>تحميل</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 8. CERTIFICATES TAB */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-sky-600" />
                  سجل الشهادات والمعدلات التراكمية المعتمدة
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentCerts.length > 0 ? (
                    studentCerts.map((cert) => (
                      <div key={cert.id} className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3 border border-indigo-900 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-amber-400 font-bold">{cert.term} ({cert.academicYear})</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                            {cert.gradeLabel}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-black">شهادة تقدير وتفوق أكاديمي</p>
                          <p className="text-xs text-slate-300 mt-1">المعدل: <strong className="text-emerald-400 font-mono">{cert.gpa}</strong> | النسبة: <strong className="text-emerald-400 font-mono">{cert.percentage}%</strong></p>
                        </div>
                        <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-slate-400">
                          <span>الترتيب: {cert.rankInClass || 1} على الصف</span>
                          <span>مصدورة بتاريخ: {cert.generatedDate}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl">
                      الشهادات الرسمية يصدر اعتمادها مع بداية كشوفات الفصل الحالي
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 9. NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-600" />
                  ملاحظات المرشد الطلابي والكادر التعليمي
                </h3>

                {/* Add new note form */}
                <form onSubmit={handleAddNote} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <textarea
                    rows={2}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="اكتب ملاحظة جديدة أو توجيه تربوي خاص بالطالب..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-amber-400" />
                      <span>حفظ الملاحظة</span>
                    </button>
                  </div>
                </form>

                {/* Existing notes list */}
                <div className="space-y-3">
                  {studentNotes.map((note) => (
                    <div key={note.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900">{note.author}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{note.date}</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. ACTIVITIES TAB */}
          {activeTab === 'activities' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  الأنشطة والفعاليات اللامنهجية
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'نادي الإبداع والابتكار العلمي', role: 'عضو مشارك', status: 'نشط' },
                    { title: 'جماعة الكشافة والإرشاد المدرسي', role: 'نائب قائد المجموعة', status: 'نشط' },
                    { title: 'المسابقة المنهجية العامة', role: 'تمثيل المدرسة', status: 'مكتمل' },
                  ].map((act, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-900">{act.title}</p>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px]">{act.status}</span>
                      </div>
                      <p className="text-slate-600 font-medium">الصفة: {act.role}</p>
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
              <h3 className="text-lg font-black text-slate-900">معاينة التقرير الموحد للطباعة</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5"
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
                reportTitle={`الملف الشامل للطالب: ${student.name}`}
                reportSubtitle={`الرقم الأكاديمي: ${student.academicId} | الصف: ${schoolClass?.name || ''}`}
              >
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div><strong>الاسم:</strong> {student.name}</div>
                    <div><strong>الرقم الأكاديمي:</strong> {student.academicId}</div>
                    <div><strong>ولي الأمر:</strong> {student.parentName} ({student.parentPhone})</div>
                    <div><strong>نسبة الحضور:</strong> {attendanceRate}%</div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 pt-2 border-b pb-1">نتائج الاختبارات</h4>
                  <table className="w-full text-right border border-slate-300">
                    <thead className="bg-slate-100 font-bold">
                      <tr>
                        <th className="p-2 border">المادة</th>
                        <th className="p-2 border">الدرجة</th>
                        <th className="p-2 border">العظمى</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentGrades.map(g => (
                        <tr key={g.id}>
                          <td className="p-2 border">{db.subjects.find(s => s.id === g.subjectId)?.name || 'مادة'}</td>
                          <td className="p-2 border">{g.score}</td>
                          <td className="p-2 border">{g.maxScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </UnifiedPrintLayout>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfileDashboard;
