import React, { useState, useEffect } from 'react';
import { getRealmDB, subscribeRealmDB, addSavedReportLog, deleteSavedReportLog } from '../lib/db';
import { SavedReport } from '../types';
import { ReportPreviewModal } from '../components/ReportPreviewModal';
import { ActiveReportPrintView } from '../components/ActiveReportPrintView';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  FileText, Download, Printer, Filter, Calendar, Users, DollarSign, Award,
  CheckCircle2, TrendingUp, ShieldAlert, BookOpen, Bus, Wrench, Package,
  Layers, BarChart3, PieChart, Activity, Star, UserCheck, AlertTriangle,
  Building2, Sparkles, Check, Phone, Mail, MapPin, Globe, Share2, Eye,
  ClipboardList, GraduationCap, Briefcase, FileSpreadsheet, Percent, Clock,
  AlertCircle, Search, ChevronRight, CheckSquare, Wrench as WrenchIcon,
  HelpCircle, ThumbsUp, Trash2, Plus, ExternalLink, FileCheck, History
} from 'lucide-react';

export type ReportTab =
  | 'reports_center'
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'attendance'
  | 'academic'
  | 'financial'
  | 'library'
  | 'certificates'
  | 'users'
  | 'audit'
  | 'executive_annual'
  | 'saved_history'
  | 'kpi_dashboard'
  | 'transport'
  | 'maintenance'
  | 'inventory';

export const ReportsScreen: React.FC = () => {
  const [dbState, setDbState] = useState(getRealmDB());

  useEffect(() => {
    const unsubscribe = subscribeRealmDB(() => {
      setDbState(getRealmDB());
    });
    return () => unsubscribe();
  }, []);

  const db = dbState;
  const [activeTab, setActiveTab] = useState<ReportTab>('reports_center');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // History Log tab specific states
  const [historyFormatFilter, setHistoryFormatFilter] = useState<'all' | 'PDF' | 'Excel' | 'Printed'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportType, setNewReportType] = useState<ReportTab>('executive_annual');
  const [newReportFormat, setNewReportFormat] = useState<'PDF' | 'Excel' | 'Printed'>('PDF');
  const [newReportNotes, setNewReportNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Core metrics derived from real database
  const totalStudents = db.students.length || 1245;
  const totalTeachers = db.teachers.length || 78;
  const totalClasses = db.classes.length || 18;
  const totalSections = db.sections.length || 42;
  const adminStaffCount = 21;
  const subjectsCount = 36;
  const newStudentsCount = Math.round(totalStudents * 0.13) || 165;
  const transferredStudentsCount = 38;
  const withdrawnStudentsCount = 7;

  // Attendance statistics
  const presentCount = db.attendance.filter(a => a.status === 'present').length || Math.round(totalStudents * 0.966);
  const absentCount = db.attendance.filter(a => a.status === 'absent').length || Math.round(totalStudents * 0.019);
  const lateCount = db.attendance.filter(a => a.status === 'late').length || Math.round(totalStudents * 0.015);
  const totalAtt = db.attendance.length || totalStudents;
  const attRate = Math.round((presentCount / totalAtt) * 100) || 97;

  // Financial statistics
  const totalExpected = db.payments.reduce((s, p) => s + (p.amount ?? p.totalAmount ?? 0), 0) || 86500000;
  const totalPaid = db.payments.reduce((s, p) => s + (p.paidAmount || 0), 0) || 74800000;
  const totalRemaining = db.payments.reduce((s, p) => s + (p.remainingAmount || 0), 0) || 11700000;
  const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 86;

  // Academic statistics by class
  const classPerformance = db.classes.map(c => {
    const clsStudents = db.students.filter(s => s.classId === c.id).map(s => s.id);
    const clsGrades = db.grades.filter(g => clsStudents.includes(g.studentId));
    const avg = clsGrades.length > 0
      ? Math.round((clsGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0)) / clsGrades.length)
      : 92;
    return { name: c.name, average: avg, students: clsStudents.length || Math.round(totalStudents / totalClasses) };
  });

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // Export helper for Excel / CSV with auto-logging to database
  const handleExportCSV = (reportTitle: string) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for Arabic
    csvContent += `تقرير ${db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"} - ${reportTitle}\n`;
    csvContent += `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}\n\n`;

    if (activeTab === 'students' || activeTab === 'executive_annual') {
      csvContent += "الرقم الأكاديمي,اسم الطالب,الصف الدراسي,الشعبة,حالة الرسوم\n";
      db.students.forEach(s => {
        const cls = db.classes.find(c => c.id === s.classId)?.name || s.classId;
        const sec = db.sections.find(x => x.id === s.sectionId)?.name || s.sectionId;
        csvContent += `${s.id},${s.name},${cls},${sec},منتظم\n`;
      });
    } else if (activeTab === 'teachers') {
      csvContent += "الرقم الوظيفي,اسم المعلم,التخصص الدراسي,الدرجة العلمية,المعدل التقيمي\n";
      db.teachers.forEach(t => {
        csvContent += `${t.id},${t.name},${t.specialization},${t.qualification},94%\n`;
      });
    } else if (activeTab === 'financial') {
      csvContent += "رقم السند,الطالب,البيان,المبلغ المستحق,المدفوع,المتبقي,الحالة\n";
      db.payments.forEach(p => {
        const stuName = db.students.find(s => s.id === p.studentId)?.name || p.studentId;
        csvContent += `${p.id},${stuName},${p.title},${p.amount ?? p.totalAmount ?? 0},${p.paidAmount || 0},${p.remainingAmount || 0},${p.status}\n`;
      });
    } else {
      // General fallback export
      csvContent += "البند الإحصائي,القيمة المسجلة,ملاحظات\n";
      csvContent += `إجمالي الطلاب,${totalStudents},منتظمين\n`;
      csvContent += `إجمالي المعلمين,${totalTeachers},على رأس العمل\n`;
      csvContent += `نسبة الحضور,%${attRate},ممتاز\n`;
      csvContent += `نسبة التحصيل المالي,%${collectionRate},جيد جداً\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save report to log database
    addSavedReportLog({
      title: `${reportTitle} (تصدير Excel/CSV)`,
      reportType: activeTab,
      reportTypeLabel: currentTabInfo?.label || reportTitle,
      fileFormat: 'Excel',
      summaryMetrics: [
        { label: 'إجمالي الطلاب', value: totalStudents },
        { label: 'نسبة الحضور', value: `${attRate}%` },
        { label: 'التحصيل المالي', value: `${collectionRate}%` }
      ],
      notes: `تم تصدير ملف Excel/CSV وتنزيله جهاز المستخدم`
    });
    showToast(`تم تصدير وحفظ "${reportTitle}" في سجل التقارير المحفوظة بنجاح`);
  };

  const handlePrintPDF = () => {
    // Save report to log database
    addSavedReportLog({
      title: `${currentTabInfo.label} (معاينة وطباعة)`,
      reportType: activeTab,
      reportTypeLabel: currentTabInfo.label,
      fileFormat: 'PDF',
      summaryMetrics: [
        { label: 'إجمالي الطلاب', value: totalStudents },
        { label: 'نسبة الحضور', value: `${attRate}%` },
        { label: 'نسبة التحصيل', value: `${collectionRate}%` }
      ],
      notes: `تم توليد التقرير وفتحه في وضع معاينة الطباعة لإنشاء ملف PDF`
    });
    showToast(`تم فتح وحفظ "${currentTabInfo.label}" في سجل التقارير المحفوظة`);
    setShowPrintModal(true);
  };

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'reports_center', label: 'مركز التقارير الرئيسية', icon: <Layers className="w-4 h-4 text-blue-600" /> },
    { id: 'students', label: 'تقارير الطلاب', icon: <Users className="w-4 h-4 text-indigo-500" /> },
    { id: 'teachers', label: 'تقارير المعلمين', icon: <GraduationCap className="w-4 h-4 text-emerald-500" /> },
    { id: 'classes', label: 'تقارير الفصول والشعب', icon: <Building2 className="w-4 h-4 text-teal-500" /> },
    { id: 'subjects', label: 'تقارير المواد المقررة', icon: <ClipboardList className="w-4 h-4 text-sky-500" /> },
    { id: 'attendance', label: 'تقارير الحضور والغياب', icon: <Calendar className="w-4 h-4 text-purple-500" /> },
    { id: 'academic', label: 'تقارير الدرجات والنتائج', icon: <Award className="w-4 h-4 text-rose-500" /> },
    { id: 'financial', label: 'التقارير المالية والتحصيل', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
    { id: 'library', label: 'تقارير المكتبة', icon: <BookOpen className="w-4 h-4 text-cyan-500" /> },
    { id: 'certificates', label: 'تقارير الشهادات والتخرج', icon: <FileCheck className="w-4 h-4 text-amber-500" /> },
    { id: 'users', label: 'تقارير المستخدمين', icon: <UserCheck className="w-4 h-4 text-indigo-600" /> },
    { id: 'audit', label: 'سجل العمليات والتدقيق', icon: <ShieldAlert className="w-4 h-4 text-rose-600" /> },
    { id: 'executive_annual', label: 'التقارير السنوية الشاملة', icon: <FileSpreadsheet className="w-4 h-4 text-amber-600" /> },
    { id: 'saved_history', label: 'أرشيف التقارير المحفوظة', icon: <History className="w-4 h-4 text-purple-600" />, badge: db.savedReports?.length || 0 },
    { id: 'kpi_dashboard', label: 'مؤشرات الأداء KPI', icon: <BarChart3 className="w-4 h-4 text-blue-500" /> },
  ];

  const currentTabInfo = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16" dir="rtl">
      {/* Top Banner Controls (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">منظومة التقارير المؤسسية الشاملة (School ERP Reports)</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              تصدير وتحليل 12 تقريراً تشغيللِياً وإدارياً شاملاً لأقسام المدرسة ومؤشرات الأداء مع دعم التصدير لـ PDF و Excel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={() => handleExportCSV(currentTabInfo.label)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer border border-slate-300/80"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-300" />
            <span>معاينة الطباعة وتصدير PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selector Tabs (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs overflow-x-auto print:hidden">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-white' : ''}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Print Preview Mode Banner (To reduce printing errors) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-4 md:p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden border border-indigo-800/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6 text-blue-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm md:text-base text-white">وضع معاينة الطباعة (Print Preview Modal)</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                ✓ لتقليل الأخطاء وضمان جودة الطباعة
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-1 font-medium leading-relaxed">
              يظهر لك كيف سيبدو <strong className="text-amber-300 font-bold">({currentTabInfo.label})</strong> على الورق قبل إرساله للطابعة، مع تحكم كامل بالترويسة، الأختام، واتجاه الورقة.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => handleExportCSV(currentTabInfo.label)}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer border border-white/10"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer scale-102 hover:scale-105"
          >
            <Eye className="w-4 h-4 text-amber-300" />
            <span>فتح شاشة معاينة الطباعة</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TAB 0: REPORTS CENTER CATALOG (مركز التقارير الرئيسية) */}
      {activeTab === 'reports_center' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl md:text-2xl font-black">مركز التقارير المدرسية المؤسسي (Reports Center)</h2>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                    12 تصنيفاً معتمداً 3NF
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-1 max-w-2xl font-medium leading-relaxed">
                  تصفّح كافة تقارير المؤسسة التعليمية واستخرج كشوفات الطلاب، المعلمين، الفصول، المواد، الحضور، الدرجات، الرسوم المالية، الشهادات، والمستخدمين مع دعم كامل للطباعة التفاعلية والتصدير بصيغ PDF و Excel.
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث في تصنيفات التقارير..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-4 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* 12 Enterprise Report Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                id: 'students' as ReportTab,
                title: 'تقارير الطلاب',
                desc: 'كشوفات الطلاب المسجلين، توزيع الشعب، بيانات أولياء الأمور وحالة الانتظام الأكاديمي.',
                stat: `${db.students.length || 1245} طالب منتظم`,
                color: 'from-blue-600 to-indigo-600',
                icon: <Users className="w-6 h-6 text-blue-600" />,
                bgColor: 'bg-blue-50/70 border-blue-200/80',
              },
              {
                id: 'teachers' as ReportTab,
                title: 'تقارير المعلمين',
                desc: 'بيانات الكادر التعليمي، التخصصات والمؤهلات، الأنساب الأسبوعية وحالة رأس العمل.',
                stat: `${db.teachers.length || 78} معلم عضو`,
                color: 'from-emerald-600 to-teal-600',
                icon: <GraduationCap className="w-6 h-6 text-emerald-600" />,
                bgColor: 'bg-emerald-50/70 border-emerald-200/80',
              },
              {
                id: 'classes' as ReportTab,
                title: 'تقارير الفصول والشعب',
                desc: 'قاعات الدراسة، السعة الاستيعابية، توزيع المقاعد، ومشرفو الشعب الدراسية.',
                stat: `${db.classes.length || 18} فصل (${db.sections.length || 42} شعبة)`,
                color: 'from-teal-600 to-cyan-600',
                icon: <Building2 className="w-6 h-6 text-teal-600" />,
                bgColor: 'bg-teal-50/70 border-teal-200/80',
              },
              {
                id: 'subjects' as ReportTab,
                title: 'تقارير المواد المقررة',
                desc: 'المناهج الدراسية، الخطة الأسبوعية للحصص، الدرجات العظمى والصغرى والمعلم المسؤول.',
                stat: `${db.subjects.length || 36} مادة مقررة`,
                color: 'from-sky-600 to-blue-600',
                icon: <ClipboardList className="w-6 h-6 text-sky-600" />,
                bgColor: 'bg-sky-50/70 border-sky-200/80',
              },
              {
                id: 'attendance' as ReportTab,
                title: 'تقارير الحضور والغياب',
                desc: 'متابعة سجلات الحضور اليومية، نسبة الانتظام، حالات التأخير وأعذار الغياب المعتمدة.',
                stat: `نسبة الحضور: 96.8%`,
                color: 'from-purple-600 to-indigo-600',
                icon: <Calendar className="w-6 h-6 text-purple-600" />,
                bgColor: 'bg-purple-50/70 border-purple-200/80',
              },
              {
                id: 'academic' as ReportTab,
                title: 'تقارير الدرجات والنتائج',
                desc: 'رصد اختبارات الفصول، كشوفات درجات المواد، المتوسطات الأكاديمية ونسب النجاح.',
                stat: `${db.grades.length || 350} سجل رصد`,
                color: 'from-rose-600 to-pink-600',
                icon: <Award className="w-6 h-6 text-rose-600" />,
                bgColor: 'bg-rose-50/70 border-rose-200/80',
              },
              {
                id: 'financial' as ReportTab,
                title: 'التقارير المالية والتحصيل',
                desc: 'ميزانية المدرسة، تحصيل الرسوم الدراسية، الأقساط المتبقية، وسندات الصرف والمصروفات.',
                stat: `المحصل: ${(totalPaid || 2180000).toLocaleString('ar-SA')} ر.س`,
                color: 'from-emerald-600 to-green-700',
                icon: <DollarSign className="w-6 h-6 text-emerald-600" />,
                bgColor: 'bg-emerald-50/70 border-emerald-200/80',
              },
              {
                id: 'library' as ReportTab,
                title: 'تقارير المكتبة',
                desc: 'فهرس المراجع والكتب، عدد النسخ المتاحة، حركة الاستعارة، والكتب المتأخر إرجاعها.',
                stat: `${db.books.length || 150} عنوان كتاب`,
                color: 'from-cyan-600 to-blue-600',
                icon: <BookOpen className="w-6 h-6 text-cyan-600" />,
                bgColor: 'bg-cyan-50/70 border-cyan-200/80',
              },
              {
                id: 'certificates' as ReportTab,
                title: 'تقارير الشهادات والتخرج',
                desc: 'كشوفات الشهادات المصدورة، المعدلات التراكمية GPA، التقديرات السنوية ومراتب الشرف.',
                stat: `${db.certificates.length || 120} شهادة معتمدة`,
                color: 'from-amber-600 to-orange-600',
                icon: <FileCheck className="w-6 h-6 text-amber-600" />,
                bgColor: 'bg-amber-50/70 border-amber-200/80',
              },
              {
                id: 'users' as ReportTab,
                title: 'تقارير المستخدمين',
                desc: 'دليل حسابات النظام (مدراء، معلمون، طلاب، أولياء أمور) وحالة تفعيل الحسابات.',
                stat: `${db.users.length || 145} حساب مستخدم`,
                color: 'from-indigo-600 to-purple-600',
                icon: <UserCheck className="w-6 h-6 text-indigo-600" />,
                bgColor: 'bg-indigo-50/70 border-indigo-200/80',
              },
              {
                id: 'audit' as ReportTab,
                title: 'سجل العمليات والتدقيق',
                desc: 'السجل الأمني لتتبع التغييرات، إدخالات النظام، التعديلات والمستندات المصدرة.',
                stat: `${db.auditLogs.length || 350} عملية موثقة`,
                color: 'from-rose-700 to-red-700',
                icon: <ShieldAlert className="w-6 h-6 text-rose-700" />,
                bgColor: 'bg-rose-50/70 border-rose-200/80',
              },
              {
                id: 'executive_annual' as ReportTab,
                title: 'التقارير السنوية الشاملة',
                desc: 'التقرير الإداري والمالي التنفيذي، المؤشرات الاستراتيجية ونمو الأداء السنوي.',
                stat: `العام 2026 - 2027`,
                color: 'from-amber-500 to-yellow-600',
                icon: <FileSpreadsheet className="w-6 h-6 text-amber-600" />,
                bgColor: 'bg-amber-50/70 border-amber-200/80',
              },
            ]
              .filter(card => !searchQuery || card.title.includes(searchQuery) || card.desc.includes(searchQuery))
              .map((card) => (
                <div
                  key={card.id}
                  className={`rounded-3xl p-6 border transition-all duration-200 hover:shadow-lg flex flex-col justify-between space-y-4 bg-white ${card.bgColor}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-white shadow-xs border border-slate-200/60">
                        {card.icon}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-white/80 text-slate-800 border border-slate-200 shadow-2xs font-mono">
                        {card.stat}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">{card.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setActiveTab(card.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>عرض التفاصيل</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveTab(card.id);
                          handleExportCSV(card.title);
                        }}
                        title="تصدير Excel"
                        className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab(card.id);
                          setShowPrintModal(true);
                        }}
                        title="طباعة PDF"
                        className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB: SAVED REPORTS HISTORY LOG */}
      {activeTab === 'saved_history' && (
        <div className="space-y-6">
          {/* Top Banner & Stats for History Log */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-800/50 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-indigo-800/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                  <History className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-black">سجل التقارير والأرشيف المحفوظ</h2>
                    <span className="px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold text-xs">
                      قاعدة البيانات RealmDB
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-1 max-w-2xl font-medium leading-relaxed">
                    يتم هنا حفظ كافة التقارير التي تم استخراجها وتصديرها مؤخراً، مما يتيح لك الوصول السريع إليها ومراجعتها أو إعادة طباعتها وتنزيلها بضغطة زر دون الحاجة لإعادة توليد البيانات.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddReportModal(true)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ إنشاء وثيقة تقرير جديدة بالسجل</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
                <span className="text-xs text-indigo-200 block font-bold">إجمالي التقارير بالسجل</span>
                <span className="text-2xl font-black text-white mt-1 block font-mono">{db.savedReports?.length || 0}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
                <span className="text-xs text-indigo-200 block font-bold">تقارير PDF جاهزة</span>
                <span className="text-2xl font-black text-rose-300 mt-1 block font-mono">
                  {db.savedReports?.filter(r => r.fileFormat === 'PDF' || r.fileFormat === 'Printed').length || 0}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
                <span className="text-xs text-indigo-200 block font-bold">ملفات Excel المصدرة</span>
                <span className="text-2xl font-black text-emerald-300 mt-1 block font-mono">
                  {db.savedReports?.filter(r => r.fileFormat === 'Excel').length || 0}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right">
                <span className="text-xs text-indigo-200 block font-bold">آخر تحديث للسجل</span>
                <span className="text-xs font-bold text-amber-300 mt-2 block font-mono">
                  {db.savedReports?.[0]?.generatedAt || 'اليوم'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                placeholder="ابحث عن تقرير بالاسم، المُنِشئ، أو الرقم..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 ml-2 whitespace-nowrap">التصفية:</span>
              {[
                { id: 'all', label: 'كافة التقارير' },
                { id: 'PDF', label: 'مستندات PDF' },
                { id: 'Excel', label: 'تصديرات Excel' },
                { id: 'Printed', label: 'المطبوعة' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFormatFilter(f.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    historyFormatFilter === f.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Saved Reports List */}
          {(() => {
            const reports = (db.savedReports || []).filter(r => {
              const matchesSearch =
                r.title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                r.id.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                r.generatedBy.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                (r.notes && r.notes.toLowerCase().includes(historySearchQuery.toLowerCase()));
              const matchesFormat =
                historyFormatFilter === 'all' || r.fileFormat === historyFormatFilter;
              return matchesSearch && matchesFormat;
            });

            if (reports.length === 0) {
              return (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                    <History className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">لا يوجد تقارير محفوظة تطابق بحثك</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    يمكنك استخراج تقرير جديد من التبويبات بالأعلى أو استخدام زر "إنشاء وثيقة تقرير جديدة" لإضافته مباشرة في السجل.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-6 space-y-4 relative overflow-hidden group border-r-4 border-r-purple-600"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[11px] font-bold">
                            {rep.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            rep.fileFormat === 'PDF'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : rep.fileFormat === 'Excel'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {rep.fileFormat === 'PDF' ? '📄 مستند PDF' : rep.fileFormat === 'Excel' ? '📊 جدول Excel' : '🖨️ مطبوع'}
                          </span>
                        </div>
                        <h3 className="font-black text-base text-slate-900 group-hover:text-purple-700 transition-colors">
                          {rep.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {rep.reportTypeLabel}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (rep.reportType && rep.reportType !== 'custom_preview') {
                              setActiveTab(rep.reportType as ReportTab);
                            }
                            setShowPrintModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="معاينة فتح التقرير بضغطة زر"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فتح ومعاينة</span>
                        </button>
                        <button
                          onClick={() => {
                            deleteSavedReportLog(rep.id);
                            showToast(`تم حذف التقرير (${rep.id}) من السجل`);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="حذف هذا التقرير من السجل"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="grid grid-cols-2 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-xs font-medium text-slate-600 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">أُنشئ بواسطة</span>
                        <span className="font-bold text-slate-800">{rep.generatedBy}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">تاريخ ووقت الإنشاء</span>
                        <span className="font-mono text-slate-800 font-bold">{rep.generatedAt}</span>
                      </div>
                    </div>

                    {/* Summary Metrics Pills */}
                    {rep.summaryMetrics && rep.summaryMetrics.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {rep.summaryMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] font-bold text-indigo-900 flex items-center gap-1.5"
                          >
                            <span className="text-indigo-500">{m.label}:</span>
                            <span className="font-black text-indigo-700 font-mono">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {rep.notes && (
                      <p className="text-xs text-slate-500 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 font-medium leading-relaxed">
                        💡 <strong className="text-amber-900">ملاحظة:</strong> {rep.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ADD REPORT TO HISTORY MODAL */}
          {showAddReportModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200" dir="rtl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900">إضافة توثيق تقرير جديد إلى السجل</h3>
                      <p className="text-xs text-slate-500">حفظ مرجع تقرير يدوي داخل قاعدة البيانات</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddReportModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">عنوان التقرير</label>
                    <input
                      type="text"
                      placeholder="مثال: تقرير نتائج اختبارات الفصل الأول"
                      value={newReportTitle}
                      onChange={(e) => setNewReportTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-purple-600 bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">قسم التقرير المرتبط</label>
                      <select
                        value={newReportType}
                        onChange={(e) => setNewReportType(e.target.value as ReportTab)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-purple-600 bg-slate-50"
                      >
                        {tabs.filter(t => t.id !== 'saved_history').map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">صيغة التصدير</label>
                      <select
                        value={newReportFormat}
                        onChange={(e) => setNewReportFormat(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-purple-600 bg-slate-50"
                      >
                        <option value="PDF">مستند PDF</option>
                        <option value="Excel">جدول Excel</option>
                        <option value="Printed">نسخة ورقية مطبوعة</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات أو توصيات إدارية</label>
                    <textarea
                      rows={3}
                      placeholder="أدخل أي ملاحظات خاصة بالتقرير لتسهيل الرجوع إليها لاحقاً..."
                      value={newReportNotes}
                      onChange={(e) => setNewReportNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-purple-600 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowAddReportModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      if (!newReportTitle.trim()) {
                        alert('يرجى إدخال عنوان للتقرير');
                        return;
                      }
                      const tabObj = tabs.find(t => t.id === newReportType);
                      addSavedReportLog({
                        title: newReportTitle,
                        reportType: newReportType,
                        reportTypeLabel: tabObj?.label || newReportTitle,
                        fileFormat: newReportFormat,
                        notes: newReportNotes || 'تم الحفظ يدوياً بواسطة مدير النظام'
                      });
                      setShowAddReportModal(false);
                      setNewReportTitle('');
                      setNewReportNotes('');
                      showToast('تمت إضافة التقرير إلى السجل بنجاح');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition cursor-pointer shadow-md shadow-purple-600/30"
                  >
                    حفظ في السجل الآن
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: EXECUTIVE ANNUAL REPORT (EXACT MATCH TO EXECUTIVE IMAGE) */}
      {activeTab === 'executive_annual' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-8 print:border-none print:shadow-none print:p-0 text-slate-800">
          {/* Executive Header Banner */}
          <div className="border-b-2 border-amber-500/30 pb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-right">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-900/20">
                  ص
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}
                  </h1>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                    {db.settings?.nameEn || "KHALID IBN AL-WALEED SCHOOL - DHALEA/JAHAF"}
                  </p>
                </div>
              </div>

              <div className="text-center md:text-center">
                <h2 className="text-2xl md:text-3xl font-black text-blue-900 leading-tight">
                  تقرير المدرسة العام
                </h2>
                <div className="inline-block px-4 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-xs mt-2">
                  العام الدراسي {db.settings?.academicYear || "2026 - 2027"} — {db.settings?.currentTerm || "الفصل الدراسي الأول"}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-medium min-w-[200px] text-right">
                <div className="flex justify-between gap-4"><span className="text-slate-500">تاريخ التقرير:</span><span className="font-bold font-mono">{new Date().toLocaleDateString('ar-SA')}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">مدير المدرسة:</span><span className="font-bold">أ. أحمد محمد صالح</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">رقم التقرير:</span><span className="font-bold font-mono">MSR-2026-0078</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">إعداد:</span><span className="font-bold">إدارة النظم والمعلومات</span></div>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary KPIs */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <h3 className="text-lg font-black text-slate-900">الملخص التنفيذي</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 text-center">
              {[
                { label: 'إجمالي الطلاب', val: totalStudents, icon: <Users className="w-5 h-5 text-blue-600 mx-auto" /> },
                { label: 'إجمالي المعلمين', val: totalTeachers, icon: <GraduationCap className="w-5 h-5 text-emerald-600 mx-auto" /> },
                { label: 'المواد الدراسية', val: subjectsCount, icon: <BookOpen className="w-5 h-5 text-purple-600 mx-auto" /> },
                { label: 'الإداريون', val: adminStaffCount, icon: <Briefcase className="w-5 h-5 text-indigo-600 mx-auto" /> },
                { label: 'الفصول الدراسية', val: totalClasses, icon: <Building2 className="w-5 h-5 text-teal-600 mx-auto" /> },
                { label: 'الشعب', val: totalSections, icon: <Layers className="w-5 h-5 text-sky-600 mx-auto" /> },
                { label: 'الطلاب المستجدون', val: newStudentsCount, icon: <UserCheck className="w-5 h-5 text-amber-600 mx-auto" /> },
                { label: 'الطلاب المنقولون', val: transferredStudentsCount, icon: <Share2 className="w-5 h-5 text-orange-600 mx-auto" /> },
                { label: 'الطلاب المنسحبون', val: withdrawnStudentsCount, icon: <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" /> },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between">
                  <div className="mb-2">{item.icon}</div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1 truncate">{item.label}</span>
                  <span className="text-lg font-black text-slate-800 font-mono">{item.val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Middle Breakdown (Students by Grade, Donut Chart, Attendance, Teachers) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 4 Cols: Students by Grade Table + Teachers Performance */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
                  <span>توزيع الطلاب حسب الصف</span>
                  <span className="text-[11px] font-normal text-slate-500">المرحلة الثانوية</span>
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="py-2 px-3">الصف</th>
                        <th className="py-2 px-3 text-center">عدد الشعب</th>
                        <th className="py-2 px-3 text-center">عدد الطلاب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.classes.map((cls, idx) => (
                        <tr key={cls.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-800">{cls.name}</td>
                          <td className="py-2 px-3 text-center font-mono">{cls.sections.length}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                            {db.students.filter(s => s.classId === cls.id).length || Math.round(totalStudents / totalClasses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Teachers Performance Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>أداء المعلمين والمواظبة</span>
                </h4>
                <div className="space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between py-1 border-b border-slate-200"><span className="text-slate-500">عدد المعلمين:</span><span className="font-mono font-bold text-slate-800">{totalTeachers}</span></div>
                  <div className="flex justify-between py-1 border-b border-slate-200"><span className="text-slate-500">الحاضرون اليوم:</span><span className="font-mono font-bold text-emerald-600">{totalTeachers - 1}</span></div>
                  <div className="flex justify-between py-1 border-b border-slate-200"><span className="text-slate-500">الغائبون:</span><span className="font-mono font-bold text-rose-600">1</span></div>
                  <div className="flex justify-between py-1 border-b border-slate-200"><span className="text-slate-500">متوسط الحصص اليومية:</span><span className="font-mono font-bold text-indigo-600">5 حصص</span></div>
                  <div className="flex justify-between py-1 items-center">
                    <span className="text-slate-500">متوسط تقييم الأداء:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-amber-600">
                      <span>94%</span>
                      <div className="flex text-amber-400">
                        {"★★★★★".split("").map((star, i) => (
                          <span key={i}>{star}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle 4 Cols: Donut Chart of Students */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-800 mb-2 text-center">توزيع الطلاب (ذكور / إناث)</h4>
                <div className="h-48 my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={[
                          { name: 'ذكور', value: Math.round(totalStudents * 0.538) },
                          { name: 'إناث', value: Math.round(totalStudents * 0.462) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#1d4ed8" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center border-t border-slate-200 pt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="text-blue-600 font-bold block">ذكور (53.8%)</span>
                  <span className="font-mono font-black text-sm text-blue-900">{Math.round(totalStudents * 0.538)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-amber-600 font-bold block">إناث (46.2%)</span>
                  <span className="font-mono font-black text-sm text-amber-900">{Math.round(totalStudents * 0.462)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="text-emerald-600 font-bold block">الحاضرون اليوم</span>
                  <span className="font-mono font-black text-sm text-emerald-900">{presentCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                  <span className="text-purple-600 font-bold block">نسبة الحضور</span>
                  <span className="font-mono font-black text-sm text-purple-900">{attRate}%</span>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Attendance Summary Cards */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>الحضور والانصراف (الطلاب)</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>حاضر منتظم</span>
                    </div>
                    <span className="font-mono font-black text-emerald-700 text-sm">{presentCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>غائب بعذر رسمي</span>
                    </div>
                    <span className="font-mono font-black text-amber-700 text-sm">24</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>غائب بدون عذر</span>
                    </div>
                    <span className="font-mono font-black text-rose-700 text-sm">18</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>مواظبة المعلمين</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 font-bold block">حاضر</span>
                    <span className="font-mono font-black text-emerald-600 text-base">{totalTeachers - 1}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                    <span className="text-[11px] text-slate-500 font-bold block">غائب</span>
                    <span className="font-mono font-black text-rose-600 text-base">1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Academic Results & Tuition Fees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900 text-white to-slate-900 border border-blue-800 flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 font-black text-lg text-amber-400">
                  <GraduationCap className="w-6 h-6" />
                  <span>النتائج الدراسية والأكاديمية</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-2">
                  <div><span className="text-slate-300 block">نسبة النجاح العامة:</span><strong className="text-emerald-400 font-mono text-base">93.4%</strong></div>
                  <div><span className="text-slate-300 block">نسبة الرسوب:</span><strong className="text-rose-400 font-mono text-base">6.6%</strong></div>
                  <div><span className="text-slate-300 block">أعلى معدل تراكمي:</span><strong className="text-amber-300 font-mono text-base">99.8%</strong></div>
                  <div><span className="text-slate-300 block">متوسط عام المدرسة:</span><strong className="text-white font-mono text-base">85.6%</strong></div>
                </div>
              </div>
              <div className="hidden sm:flex w-24 h-24 rounded-full bg-white/10 items-center justify-center text-4xl border border-white/20">
                🎓
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900 text-white to-slate-900 border border-emerald-800 flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 font-black text-lg text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                  <span>الرسوم الدراسية والتحصيل المالي</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold pt-2">
                  <div><span className="text-slate-300 block">الرسوم المستحقة:</span><strong className="font-mono text-white text-sm">{(totalExpected / 1000).toLocaleString()} ألف ر.س</strong></div>
                  <div><span className="text-slate-300 block">المبالغ المحصلة:</span><strong className="font-mono text-emerald-400 text-sm">{(totalPaid / 1000).toLocaleString()} ألف ر.س</strong></div>
                  <div><span className="text-slate-300 block">المبالغ المتبقية:</span><strong className="font-mono text-rose-400 text-sm">{(totalRemaining / 1000).toLocaleString()} ألف ر.س</strong></div>
                  <div><span className="text-slate-300 block">نسبة التحصيل:</span><strong className="font-mono text-amber-300 text-base">{collectionRate}%</strong></div>
                </div>
              </div>
              <div className="hidden sm:flex w-24 h-24 rounded-full bg-white/10 items-center justify-center text-4xl border border-white/20">
                💰
              </div>
            </div>
          </div>

          {/* Section 4: Operational & Support Modules Grid (7 Modules) */}
          <div>
            <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <WrenchIcon className="w-5 h-5 text-indigo-600" />
              <span>التقارير التشغيلية والخدمات المساندة</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Library Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-900 mb-3 pb-2 border-b border-slate-200">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>المكتبة المدرسية</span>
                </div>
                <div className="space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between"><span className="text-slate-500">إجمالي الكتب:</span><span className="font-mono font-bold">9,420</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">الكتب المعارة:</span><span className="font-mono font-bold text-blue-600">615</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">الكتب المتأخرة:</span><span className="font-mono font-bold text-rose-600">23</span></div>
                </div>
              </div>

              {/* Labs Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-sm text-teal-900 mb-3 pb-2 border-b border-slate-200">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>المختبرات العلمية</span>
                </div>
                <div className="space-y-1 text-xs font-semibold">
                  <div className="flex justify-between"><span className="text-slate-600">الحاسوب:</span><span className="text-emerald-600 font-bold">● يعمل بكفاءة</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">العلوم والفيزياء:</span><span className="text-emerald-600 font-bold">● جاهز للعمل</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">مختبر الكيمياء:</span><span className="text-amber-600 font-bold">● صيانة دورية</span></div>
                </div>
              </div>

              {/* Transport Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900 mb-3 pb-2 border-b border-slate-200">
                  <Bus className="w-4 h-4 text-amber-600" />
                  <span>النقل المدرسي</span>
                </div>
                <div className="space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between"><span className="text-slate-500">عدد الحافلات:</span><span className="font-mono font-bold">12 حافلة</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">الطلاب المستفيدون:</span><span className="font-mono font-bold text-indigo-600">486 طالب</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">السائقون والمشرفون:</span><span className="font-mono font-bold">12 سائق</span></div>
                </div>
              </div>

              {/* Activities Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-900 mb-3 pb-2 border-b border-slate-200">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>الأنشطة والفعاليات</span>
                </div>
                <div className="space-y-1 text-xs font-semibold">
                  <div className="flex justify-between"><span className="text-slate-600">القرآن والمسابقات:</span><span className="font-mono font-bold text-purple-700">185 مشارك</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">النشاط الرياضي:</span><span className="font-mono font-bold text-purple-700">260 طالب</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">نادي الحاسب والذكاء:</span><span className="font-mono font-bold text-purple-700">138 عضو</span></div>
                </div>
              </div>

              {/* Discipline Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-900 mb-3 pb-2 border-b border-slate-200">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>المخالفات والانضباط</span>
                </div>
                <div className="space-y-1 text-xs font-semibold">
                  <div className="flex justify-between"><span className="text-slate-600">مخالفات بسيطة:</span><span className="font-mono font-bold text-amber-600">18 حالة</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">مخالفات متوسطة:</span><span className="font-mono font-bold text-rose-600">6 حالات</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">الإنذارات الموجهة:</span><span className="font-mono font-bold">12 إنذار</span></div>
                </div>
              </div>

              {/* Maintenance Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-sm text-orange-900 mb-3 pb-2 border-b border-slate-200">
                  <Wrench className="w-4 h-4 text-orange-600" />
                  <span>الصيانة والدعم</span>
                </div>
                <div className="space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between"><span className="text-slate-500">طلبات الصيانة:</span><span className="font-mono font-bold">15 طلب</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">تم إنجازها:</span><span className="font-mono font-bold text-emerald-600">13 منجز</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">قيد التنفيذ:</span><span className="font-mono font-bold text-amber-600">2 طلب</span></div>
                </div>
              </div>

              {/* Inventory & Assets Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 sm:col-span-2">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-900 mb-3 pb-2 border-b border-slate-200">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>المخازن والأصول العهدية</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-center">
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">الشاشات الذكية</span>
                    <strong className="font-mono text-slate-800">42 شاشة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">أجهزة الحاسب</span>
                    <strong className="font-mono text-slate-800">150 جهاز</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">المقاعد والعهدة</span>
                    <strong className="font-mono text-slate-800">1,350 وحدة</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Strategic Recommendations Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80">
            <h4 className="font-black text-base text-slate-900 mb-3 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              <span>التوصيات الاستراتيجية والتوجيهات الإدارية</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-slate-200"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>رفع نسبة التحصيل المالي ومتابعة الأقساط المتبقية.</span></div>
              <div className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-slate-200"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>تقليل الغياب غير المبرر عبر نظام الرسائل النصية المباشرة.</span></div>
              <div className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-slate-200"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>تعزيز الأنشطة الطلابية ونادي الذكاء الاصطناعي.</span></div>
              <div className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-slate-200"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>متابعة الطلاب المتعثرين أكاديمياً ووضع خطط تقوية.</span></div>
              <div className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-slate-200"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>تطوير وتحديث المعامل وبرامج التطوير المهني للمعلمين.</span></div>
              <div className="flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-slate-200"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>صيانة وتجهيز مختبر الكيمياء للعام الدراسي القادم.</span></div>
            </div>
          </div>

          {/* Section 6: Signatures Block */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t-2 border-slate-200 text-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 block">مسؤول النظام والمعلومات</span>
              <strong className="text-sm font-black text-slate-800 block">م. خالد سعيد الحربي</strong>
              <div className="w-32 h-12 mx-auto border-b border-dashed border-slate-400 flex items-center justify-center font-mono text-slate-300 text-[10px]">
                [التوقيع الإلكتروني]
              </div>
            </div>
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 block">وكيل المدرسة للشؤون التعليمية</span>
              <strong className="text-sm font-black text-slate-800 block">أ. محمد علي الشهري</strong>
              <div className="w-32 h-12 mx-auto border-b border-dashed border-slate-400 flex items-center justify-center font-mono text-slate-300 text-[10px]">
                [التوقيع والختم]
              </div>
            </div>
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 block">مدير عام المدرسة</span>
              <strong className="text-sm font-black text-slate-800 block">أ. أحمد محمد صالح</strong>
              <div className="w-32 h-12 mx-auto border-b border-dashed border-slate-400 flex items-center justify-center font-mono text-slate-300 text-[10px]">
                [اعتماد المدير العام]
              </div>
            </div>
          </div>

          {/* Footer Contact Bar */}
          <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber-400" /><span>+966 11 234 5678</span></div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-amber-400" /><span>info@alsalam.edu.sa</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-400" /><span>الرياض - حي السلام - شارع العلم</span></div>
            <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-amber-400" /><span>www.alsalam.edu.sa</span></div>
          </div>
        </div>
      )}

      {/* TAB 2: KPI DASHBOARD WITH CHARTS */}
      {activeTab === 'kpi_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">مؤشر المواظبة العام</span>
              <span className="text-3xl font-black text-emerald-600 font-mono">{attRate}%</span>
              <span className="text-[11px] text-slate-500 block mt-1">ارتفاع بمقدار 2.4% عن الشهر السابق 📈</span>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">نسبة التحصيل المالي</span>
              <span className="text-3xl font-black text-blue-600 font-mono">{collectionRate}%</span>
              <span className="text-[11px] text-slate-500 block mt-1">تم تحصيل {totalPaid.toLocaleString()} ر.س 💰</span>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 block mb-1">متوسط النجاح الأكاديمي</span>
              <span className="text-3xl font-black text-purple-600 font-mono">93.4%</span>
              <span className="text-[11px] text-slate-500 block mt-1">أعلى درجة تم رصدها 99.8% 🎓</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>معدلات التحصيل الأكاديمي حسب المراحل الدراسية (%)</span>
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classPerformance}>
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis domain={[0, 100]} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#4f46e5" radius={[6, 6, 0, 0]} name="المعدل التراكمي %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>توزيع نسب الحضور والانضباط السلوكي</span>
              </h3>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={[
                        { name: 'حاضر ومنتظم', value: presentCount },
                        { name: 'غائب بعذر أو بدون', value: absentCount },
                        { name: 'تأخر صباحي', value: lateCount }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENTS REPORT */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">تقرير الطلاب المسجلين وشؤون التسجيل</h3>
              <p className="text-xs text-slate-500">كشف أسماء وأعداد الطلاب الموزعين على الصفوف والشعب</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="بحث عن طالب..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium w-full sm:w-64 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">الرقم الأكاديمي</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">الصف والشعبة</th>
                  <th className="py-3 px-4">ولي الأمر</th>
                  <th className="py-3 px-4 text-center">الحالة الدراسية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.students
                  .filter(s => s.name.includes(searchQuery) || s.id.includes(searchQuery))
                  .map(s => {
                    const cls = db.classes.find(c => c.id === s.classId)?.name || s.classId;
                    const sec = db.sections.find(x => x.id === s.sectionId)?.name || s.sectionId;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 font-medium">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{s.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{s.name}</td>
                        <td className="py-3 px-4">{cls} — {sec}</td>
                        <td className="py-3 px-4 text-slate-600">{s.parentName || 'أ. عبد الله'}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            منتظم
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TEACHERS REPORT */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير أداء وشؤون المعلمين والهيئة التدريسية</h3>
            <p className="text-xs text-slate-500">تقييم الأداء، التخصصات الدراسية، ومعدلات الحضور اليومي</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">الرقم الوظيفي</th>
                  <th className="py-3 px-4">اسم المعلم</th>
                  <th className="py-3 px-4">التخصص العلمي</th>
                  <th className="py-3 px-4">المؤهل</th>
                  <th className="py-3 px-4 text-center">النصاب اليومي</th>
                  <th className="py-3 px-4 text-center">التقييم الفني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.teachers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 font-medium">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">{t.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{t.name}</td>
                    <td className="py-3 px-4 text-blue-600 font-bold">{t.specialization}</td>
                    <td className="py-3 px-4 text-slate-600">{t.qualification}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">5 حصص</td>
                    <td className="py-3 px-4 text-center font-mono font-black text-amber-600">94% ⭐</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ATTENDANCE REPORT */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير مواظبة الحضور والغياب اليومي</h3>
            <p className="text-xs text-slate-500">سجل رصد الغياب والتأخر للمراحل الدراسية مع التنبيهات الموجهة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">تاريخ الرصد</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">الصف والشعبة</th>
                  <th className="py-3 px-4 text-center">حالة الحضور</th>
                  <th className="py-3 px-4">المراقب الراصد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.attendance.map((a, idx) => {
                  const stu = db.students.find(s => s.id === a.studentId);
                  const cls = db.classes.find(c => c.id === a.classId);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{a.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{stu?.name || a.studentId}</td>
                      <td className="py-3 px-4">{cls?.name || a.classId}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          a.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غائب' : 'متأخر'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{a.recordedBy || 'المشرف الآلي'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: FINANCIAL REPORT */}
      {activeTab === 'financial' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">التقرير المالي وكشف الرسوم والأقساط والمصروفات</h3>
            <p className="text-xs text-slate-500">تحليل الإيرادات المحصلة والديون المتأخرة وحالة سداد أولياء الأمور</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">رقم السند</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">بيان الرسوم</th>
                  <th className="py-3 px-4 text-center">المبلغ المستحق</th>
                  <th className="py-3 px-4 text-center">المدفوع / المتبقي</th>
                  <th className="py-3 px-4 text-center">حالة السداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.payments.map(p => {
                  const stu = db.students.find(s => s.id === p.studentId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 font-medium">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{p.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{stu?.name || p.studentId}</td>
                      <td className="py-3 px-4 text-slate-700">{p.title}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{(p.amount ?? p.totalAmount ?? 0).toLocaleString()} ر.س</td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="text-emerald-700 font-bold">{(p.paidAmount || 0).toLocaleString()}</span> / <span className="text-rose-600">{(p.remainingAmount || 0).toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status === 'paid' ? 'مسدد بالكامل' : 'متبقي أقساط'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: ACADEMIC RESULTS REPORT */}
      {activeTab === 'academic' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير نتائج الاختبارات والتحصيل العلمي</h3>
            <p className="text-xs text-slate-500">معدلات الفصول الدراسية ونسب النجاح والتفوق التراكمي</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">الصف الدراسي</th>
                  <th className="py-3 px-4 text-center">عدد الشعب</th>
                  <th className="py-3 px-4 text-center">عدد الطلاب</th>
                  <th className="py-3 px-4 text-center">المعدل الأكاديمي العام</th>
                  <th className="py-3 px-4 text-center">التقييم الأكاديمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {db.classes.map(c => {
                  const perf = classPerformance.find(x => x.name === c.name)?.average || 92;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                      <td className="py-3 px-4 text-center font-mono">{c.sections.length} شعب</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                        {db.students.filter(s => s.classId === c.id).length || Math.round(totalStudents / totalClasses)} طالب
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-indigo-700">{perf}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          ممتاز مرتفع (A+)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: LIBRARY REPORT */}
      {activeTab === 'library' && (() => {
        const booksList = db.books || [];
        const borrowingsList = db.borrowings || [];
        const totalTitles = booksList.length;
        const totalCopies = booksList.reduce((sum, b) => sum + (b.copiesTotal || 0), 0);
        const activeBorrowCount = borrowingsList.filter(b => b.status === 'borrowed').length;
        const overdueBorrowCount = borrowingsList.filter(b => b.status === 'overdue').length;

        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-lg font-black text-slate-800">تقرير المكتبة المدرسية ومصادر التعلم</h3>
              <p className="text-xs text-slate-500">حركة الاستعارة، الكتب المتاحة، والفهارس العلمية (محدث تلقائياً من قاعدة البيانات)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-xs font-bold text-blue-600 block">عناوين الكتب المفهرسة</span>
                <strong className="text-2xl font-black text-blue-900 font-mono">{totalTitles} عنوان</strong>
                <span className="text-[11px] text-slate-500 block mt-1">{totalCopies} نسخة إجمالية</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-xs font-bold text-emerald-600 block">الكتب المتاحة للاستعارة</span>
                <strong className="text-2xl font-black text-emerald-900 font-mono">
                  {booksList.reduce((sum, b) => sum + (b.copiesAvailable || 0), 0)} نسخة
                </strong>
                <span className="text-[11px] text-emerald-700 block mt-1 font-bold">جاهزة على الأرفف</span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <span className="text-xs font-bold text-indigo-600 block">الكتب المعارة للطلاب</span>
                <strong className="text-2xl font-black text-indigo-900 font-mono">{activeBorrowCount} استعارة</strong>
                <span className="text-[11px] text-slate-500 block mt-1">جارية ضمن الموعد</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                <span className="text-xs font-bold text-rose-600 block">الكتب المتأخر إرجاعها</span>
                <strong className="text-2xl font-black text-rose-900 font-mono">{overdueBorrowCount} كتاب</strong>
                <span className="text-[11px] text-rose-700 block mt-1 font-bold">تتطلب تنبيه أولياء الأمور</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 9: TRANSPORT REPORT */}
      {activeTab === 'transport' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير النقل المدرسي والحافلات</h3>
            <p className="text-xs text-slate-500">أسطول النقل، خطوط السير في الرياض، والطلاب المستفيدون</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center"><span className="text-xs font-bold text-amber-600 block">أسطول الحافلات</span><strong className="text-2xl font-black text-amber-900 font-mono">12 حافلة حديثة</strong></div>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center"><span className="text-xs font-bold text-indigo-600 block">الطلاب المشتركين بالنقل</span><strong className="text-2xl font-black text-indigo-900 font-mono">486 طالب</strong></div>
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100 text-center"><span className="text-xs font-bold text-teal-600 block">السائقون والمشرفون</span><strong className="text-2xl font-black text-teal-900 font-mono">12 سائق معتمد</strong></div>
          </div>
        </div>
      )}

      {/* TAB 10: CLASSES & SECTIONS REPORT */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير الفصول والشعب الدراسية</h3>
            <p className="text-xs text-slate-500">السعة الاستيعابية للفصول، أعداد الطلاب بكل شعبة، ورائد الصف</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">الصف الدراسي</th>
                  <th className="py-3 px-4 text-center">عدد الشعب</th>
                  <th className="py-3 px-4 text-center">إجمالي الطلاب</th>
                  <th className="py-3 px-4 text-center">نسبة إشغال المقاعد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {db.classes.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                    <td className="py-3 px-4 text-center font-mono">{c.sections.length} شعب</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">{db.students.filter(s => s.classId === c.id).length || 120} طالب</td>
                    <td className="py-3 px-4 text-center"><span className="text-emerald-700 font-mono font-bold">94%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 11: MAINTENANCE REPORT */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير الصيانة العامة والمرافق</h3>
            <p className="text-xs text-slate-500">طلبات الصيانة الدورية والمعالجات الفنية لمعامل التكييف والكهرباء</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100"><span className="text-xs font-bold text-orange-600 block">طلبات الصيانة المفتوحة</span><strong className="text-2xl font-black text-orange-900 font-mono">15 طلب</strong></div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100"><span className="text-xs font-bold text-emerald-600 block">تم إنجازها وصيانتها</span><strong className="text-2xl font-black text-emerald-900 font-mono">13 طلب 🟢</strong></div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100"><span className="text-xs font-bold text-amber-600 block">قيد التنفيذ والمتابعة</span><strong className="text-2xl font-black text-amber-900 font-mono">2 طلب 🟡</strong></div>
          </div>
        </div>
      )}

      {/* TAB 12: INVENTORY & ASSETS REPORT */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-black text-slate-800">تقرير المخازن والأصول والعهد المدرسية</h3>
            <p className="text-xs text-slate-500">حصر الأصول الثابتة، الأثاث المدرسي، الشاشات التفاعلية، ومخزون الكتب</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-500 block">الشاشات التفاعلية</span><strong className="text-2xl font-black text-slate-800 font-mono">42 شاشة</strong></div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-500 block">أجهزة حاسوب المعامل</span><strong className="text-2xl font-black text-blue-600 font-mono">150 جهاز</strong></div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-500 block">مقاعد وطاولات الطلاب</span><strong className="text-2xl font-black text-emerald-600 font-mono">1,350 وحدة</strong></div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200"><span className="text-xs font-bold text-slate-500 block">تجهيزات المختبرات</span><strong className="text-2xl font-black text-purple-600 font-mono">35 حقيبة</strong></div>
          </div>
        </div>
      )}

      {/* TAB: SUBJECTS REPORT */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-800">تقرير المناهج والمواد المقررة</h3>
              <p className="text-xs text-slate-500 mt-0.5">تفاصيل المقررات الدراسية، الحصص الأسبوعية، والمعلم المسؤول عن المادة</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-xs">
              {db.subjects?.length || 0} مادة مسجلة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">رمز المادة</th>
                  <th className="py-3 px-4">اسم المادة</th>
                  <th className="py-3 px-4">الصف الدراسي</th>
                  <th className="py-3 px-4">المعلم المسؤول</th>
                  <th className="py-3 px-4 text-center">الحصص الأسبوعية</th>
                  <th className="py-3 px-4 text-center">الدرجة العظمى / النجاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {db.subjects.map(sub => {
                  const cls = db.classes.find(c => c.id === sub.classId)?.name || sub.classId;
                  const tch = db.teachers.find(t => t.id === sub.teacherId)?.name || sub.teacherId;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-slate-500">{sub.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                      <td className="py-3 px-4 text-slate-700">{cls}</td>
                      <td className="py-3 px-4 text-indigo-700 font-bold">{tch}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">{sub.weeklyHours} حصة</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">{sub.maxScore} / {sub.passScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CERTIFICATES REPORT */}
      {activeTab === 'certificates' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-800">تقرير الشهادات والمعدلات التراكمية</h3>
              <p className="text-xs text-slate-500 mt-0.5">كشوفات الشهادات المعتمدة المصدورة من إدارة المدرسة والتقديرات السنوية</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
              {db.certificates?.length || 0} شهادة معتمدة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4 text-center">الفصل الدراسي</th>
                  <th className="py-3 px-4 text-center">العام الدراسي</th>
                  <th className="py-3 px-4 text-center">المعدل GPA</th>
                  <th className="py-3 px-4 text-center">النسبة المئوية</th>
                  <th className="py-3 px-4 text-center">التقدير العام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {db.certificates.map(cert => {
                  const stu = db.students.find(s => s.id === cert.studentId)?.name || cert.studentId;
                  return (
                    <tr key={cert.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{stu}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{cert.term}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{cert.academicYear}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-blue-700">{cert.gpa}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-emerald-700">{cert.percentage}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                          {cert.gradeLabel || 'ممتاز'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USERS REPORT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-800">تقرير دليل حسابات المستخدمين</h3>
              <p className="text-xs text-slate-500 mt-0.5">حسابات النظام الإدارية، المعلمون، الطلاب، وأولياء الأمور</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
              {db.users?.length || 0} حساب مسجل
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">اسم المستخدم</th>
                  <th className="py-3 px-4">الدور (Role)</th>
                  <th className="py-3 px-4">البريد الإلكتروني</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4 text-center">حالة الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {db.users.map(usr => (
                  <tr key={usr.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{usr.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {usr.role === 'admin' ? 'مدير نظام' : usr.role === 'teacher' ? 'معلم' : usr.role === 'student' ? 'طالب' : 'ولي أمر'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{usr.email}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{usr.phone}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        نشط 🟢
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AUDIT LOGS REPORT */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-800">تقرير سجل الحركات والعمليات (Audit Logs)</h3>
              <p className="text-xs text-slate-500 mt-0.5">مراقبة وتوثيق كافة التعديلات، التغييرات المالية والإدارية للنظام</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
              {db.auditLogs?.length || 0} حركة موثقة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">التوقيت</th>
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-4">الإجراء</th>
                  <th className="py-3 px-4">تفاصيل الحركة</th>
                  <th className="py-3 px-4 text-center">عنوان IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {db.auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.userName} ({log.userRole})</td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate">{log.details}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">{log.ip || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Print Preview Modal */}
      <ReportPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        reportTitle={currentTabInfo.label}
        reportSubtitle={`تقرير تحليلي وتشغيلي معتمد — العام الدراسي ${db.settings?.academicYear || "2026 - 2027"}`}
        defaultOrientation={['financial', 'kpi_dashboard', 'executive_annual', 'library', 'students', 'teachers', 'attendance'].includes(activeTab) ? 'landscape' : 'portrait'}
      >
        <ActiveReportPrintView activeTab={activeTab} db={db} />
      </ReportPreviewModal>
    </div>
  );
};
