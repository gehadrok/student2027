import React, { useState, useEffect } from 'react';
import { 
  Users, GraduationCap, DollarSign, UserCheck, UserX, TrendingUp, TrendingDown,
  AlertTriangle, ArrowUpRight, ShieldAlert, Sparkles, CheckCircle2, Calendar, 
  FileText, Bell, Award, Clock, AlertCircle, Eye, X, BookOpen, Check, BellRing,
  Filter, ChevronRight, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { AppNotification, SchoolSettings } from '../types';
import { dashboardService } from '../modules/dashboard/services/dashboardService';
import {
  DashboardKpis,
  TopStudent,
  StrugglingStudent,
  ClassAbsence,
  UpcomingExam
} from '../modules/dashboard/types';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenAI: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onOpenAI }) => {
  // ---------------------------------------------------------------------------
  // Use DashboardService instead of direct getRealmDB()
  // Violation fixed: no longer imports getRealmDB() from lib/db
  // Async loading via service (now Promise-based)
  // ---------------------------------------------------------------------------
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [kpis, setKpis] = useState<DashboardKpis>({
    totalStudents: 0,
    presentStudentsCount: 0,
    absentStudentsCount: 0,
    studentAttendanceRate: 0,
    totalTeachers: 0,
    presentTeachersCount: 0,
    absentTeachersCount: 0,
    teacherAttendanceRate: 0,
    feesCollectedToday: 0,
    todayTransactionsCount: 0,
    overdueFeesTotal: 0,
    overdueCount: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netBalance: 0
  });
  const [topStudentsList, setTopStudentsList] = useState<TopStudent[]>([]);
  const [strugglingStudentsList, setStrugglingStudentsList] = useState<StrugglingStudent[]>([]);
  const [mostAbsentClasses, setMostAbsentClasses] = useState<ClassAbsence[]>([]);
  const [classDistribution, setClassDistribution] = useState<{ name: string; count: number }[]>([]);
  const [attBreakdown, setAttBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);
  const [notificationsData, setNotificationsData] = useState<AppNotification[]>([]);
  const [upcomingExamsList, setUpcomingExamsList] = useState<UpcomingExam[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsData, kpisData, topStudents, strugglingStudents, absentClasses, distribution, breakdown, notifications, exams] = await Promise.all([
          dashboardService.getSettings(),
          dashboardService.getKpis(),
          dashboardService.getTopStudents(5),
          dashboardService.getStrugglingStudents(),
          dashboardService.getMostAbsentClasses(),
          dashboardService.getClassDistribution(),
          dashboardService.getAttendanceBreakdown(),
          dashboardService.getNotifications(),
          dashboardService.getUpcomingExams()
        ]);
        if (cancelled) return;
        setSettings(settingsData);
        setKpis(kpisData);
        setTopStudentsList(topStudents);
        setStrugglingStudentsList(strugglingStudents);
        setMostAbsentClasses(absentClasses);
        setClassDistribution(distribution);
        setAttBreakdown(breakdown);
        setNotificationsData(notifications);
        setUpcomingExamsList(exams);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 1 & 2. Student Attendance KPIs
  // ---------------------------------------------------------------------------
  const totalStudents = kpis.totalStudents;
  const presentStudentsCount = kpis.presentStudentsCount;
  const absentStudentsCount = kpis.absentStudentsCount;
  const studentAttendanceRate = kpis.studentAttendanceRate;

  // ---------------------------------------------------------------------------
  // 3 & 4. Teacher Attendance KPIs
  // ---------------------------------------------------------------------------
  const totalTeachers = kpis.totalTeachers;
  const absentTeachersCount = kpis.absentTeachersCount;
  const presentTeachersCount = kpis.presentTeachersCount;
  const teacherAttendanceRate = kpis.teacherAttendanceRate;

  // ---------------------------------------------------------------------------
  // 5 & 6. Financial KPIs (Fees Collected Today & Overdue Fees)
  // ---------------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];
  const feesCollectedToday = kpis.feesCollectedToday;
  const todayTransactionsCount = kpis.todayTransactionsCount;
  const overdueFeesTotal = kpis.overdueFeesTotal;
  const overdueCount = kpis.overdueCount;
  const totalRevenue = kpis.totalRevenue;
  const totalExpenses = kpis.totalExpenses;
  const netBalance = kpis.netBalance;

  // ---------------------------------------------------------------------------
  // 7. Upcoming Exams (الامتحانات القادمة) — loaded async above
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // 8. Notifications (الإشعارات) State & List
  // ---------------------------------------------------------------------------
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (notificationsData && notificationsData.length > 0) return notificationsData;
    return [
      { id: 'n1', title: 'مواعيد امتحانات الفصل الأول', message: 'تعلن إدارة المدرسة عن جدول الامتحانات النهائية المعتمدة على المنصة.', type: 'info', isRead: false, createdAt: 'اليوم 08:00 ص' },
      { id: 'n2', title: 'تنبيه غياب طالب متكرر', message: 'تم رصد غياب الطالب عمر إبراهيم لـ 3 أيام متتالية دون تقديم عذر طبي.', type: 'warning', isRead: false, createdAt: 'اليوم 09:30 ص' },
      { id: 'n3', title: 'تحصيل رسوم دراسية جديدة', message: 'تم استلام مبلغ 150,000 ر.س سداد الأقساط المدرسية عبر نظام الكريمي.', type: 'success', isRead: true, createdAt: 'أمس 04:15 م' },
      { id: 'n4', title: 'تنبيه تأخر سداد أقساط', message: 'يوجد 4 أولياء أمور تجاوزوا موعد استحقاق القسط الثاني للرسوم.', type: 'danger', isRead: false, createdAt: 'أمس 02:00 م' }
    ];
  });

  // When DB notifications arrive asynchronously, adopt them (fallback above used at mount).
  useEffect(() => {
    if (notificationsData && notificationsData.length > 0) {
      setNotifications(notificationsData);
    }
  }, [notificationsData]);

  const toggleNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Financial flow (static for now)
  const financialFlow = [
    { month: 'أبريل', revenue: 45000, expenses: 38000 },
    { month: 'مايو', revenue: 72000, expenses: 42000 },
    { month: 'يونيو', revenue: 110000, expenses: 145000 },
    { month: 'يوليو (الحالي)', revenue: totalRevenue || 180000, expenses: totalExpenses || 75000 },
  ];

  // Modal State for struggling student details
  const [selectedStrugglingStudent, setSelectedStrugglingStudent] = useState<any | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* WELCOME BANNER WITH AI ALERT */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>نظام الإدارة المدرسية الذكي والتنفيذي (العام 2026)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            مرحباً بك، أ. عبدالله الغامدي 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
            مؤشرات الأداء الرئيسية والتحليلات اللحظية لمدرسة <span className="text-white font-bold">{settings?.schoolName || "خالد ابن الوليد"}</span>. 
            تتضمن متابعة الحضور، التحصيل المالي، الامتحانات القادمة، والطلاب المتفوقين والمتعثرين.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10 w-full md:w-auto">
          <button
            onClick={() => onNavigate('ai-insights')}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400/30"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>التحليلات الذكية AI Insights</span>
          </button>
          <button
            onClick={onOpenAI}
            className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>المستشار الذكي</span>
          </button>
          <button
            onClick={() => onNavigate('attendance')}
            className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>تسجيل الحضور</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: THE 6 MAIN KPI CARDS (ATTENDANCE, TEACHERS & FINANCIALS)
          ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>مؤشرات الأداء اللحظية (KPI Cards)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">محدّث مباشرة من قاعدة البيانات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* 1. الطلاب الحاضرون */}
          <div 
            onClick={() => onNavigate('attendance')}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-emerald-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">الطلاب الحاضرون</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{presentStudentsCount}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                {studentAttendanceRate}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>من أصل {totalStudents} طالب</span>
              <span className="text-emerald-600 font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> ممتازة</span>
            </p>
          </div>

          {/* 2. الطلاب الغائبون */}
          <div 
            onClick={() => onNavigate('attendance')}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-rose-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">الطلاب الغائبون</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{absentStudentsCount}</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                {Math.round((absentStudentsCount / totalStudents) * 100)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>حالات غياب اليوم</span>
              <span className="text-rose-600 font-bold">متابعة الأسباب</span>
            </p>
          </div>

          {/* 3. المعلمون الحاضرون */}
          <div 
            onClick={() => onNavigate('teachers')}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-teal-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">المعلمون الحاضرون</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{presentTeachersCount}</span>
              <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                {teacherAttendanceRate}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>من أصل {totalTeachers} معلم</span>
              <span className="text-teal-600 font-bold">تغطية الحصص</span>
            </p>
          </div>

          {/* 4. المعلمون الغائبون */}
          <div 
            onClick={() => onNavigate('teachers')}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-amber-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">المعلمون الغائبون</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{absentTeachersCount}</span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                إجازة / غياب
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>تغطية الاحتياط</span>
              <span className="text-amber-600 font-bold">تحديد بديل</span>
            </p>
          </div>

          {/* 5. الرسوم المحصلة اليوم */}
          <div 
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-blue-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">الرسوم المحصلة اليوم</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900">
                {(feesCollectedToday).toLocaleString()} <span className="text-[10px] text-slate-500 font-semibold">ر.س</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>عدد العمليات: {todayTransactionsCount}</span>
              <span className="text-blue-600 font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> +15%</span>
            </p>
          </div>

          {/* 6. الرسوم المتأخرة */}
          <div 
            onClick={() => onNavigate('financial')}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:border-purple-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500">الرسوم المتأخرة</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-900">
                {(overdueFeesTotal).toLocaleString()} <span className="text-[10px] text-slate-500 font-semibold">ر.س</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>عدد الأقساط: {overdueCount}</span>
              <span className="text-purple-600 font-bold">تحصيل عاجل</span>
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: ROW 2 - CLASSES ABSENCE & NOTIFICATIONS & CHARTS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 11. أكثر الصفوف غياباً + Attendance Breakdown Bar */}
        <div className="lg:col-span-2 space-y-6">
          {/* أكثر الصفوف غياباً Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">أكثر الصفوف غياباً وتراجعاً في الانضباط</h3>
                  <p className="text-xs text-slate-500">ترتيب الصفوف الدراسية حسب نسبة حالات الغياب المرصودة</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
              >
                تقرير الانضباط الكامل
              </button>
            </div>

            <div className="space-y-3.5">
              {mostAbsentClasses.map((cls, idx) => (
                <div key={cls.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-900">{cls?.name || ''}</span>
                      <span className="text-[11px] font-normal text-slate-500">({cls.studentCount} طالب)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{cls.absentCount} حالات غياب</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        cls.absenceRate > 10 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700'
                      }`}>
                        نسبة الغياب: {cls.absenceRate}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        cls.absenceRate > 10 ? 'bg-rose-500' : cls.absenceRate > 5 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${Math.min(100, cls.absenceRate * 4)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart: Students per class level */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">توزيع الطلاب حسب الصفوف الدراسية</h3>
                <p className="text-xs text-slate-500">أعداد الطلاب المسجلين بالصفوف الثانوية والمراحل العلمية</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                إحصائية حية
              </span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" name="عدد الطلاب" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 8. الإشعارات (Notifications Widget) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 relative">
                  <BellRing className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">التنبيهات والإشعارات</h3>
                  <p className="text-[11px] text-slate-500">تحديثات النظام وتنبيهات الأداء</p>
                </div>
              </div>

              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {notifications.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => toggleNotificationRead(notif.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    notif.isRead 
                      ? 'bg-slate-50/60 border-slate-100 opacity-75 hover:opacity-100' 
                      : 'bg-amber-50/40 border-amber-200/70 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-xs font-bold ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{notif.createdAt}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 text-[10px]">
                    <span className={`px-2 py-0.5 rounded-md font-bold ${
                      notif.type === 'danger' ? 'bg-rose-100 text-rose-700' :
                      notif.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                      notif.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {notif.type === 'danger' ? 'تنبيه عاجل' : notif.type === 'warning' ? 'تحذير' : notif.type === 'success' ? 'نجاح' : 'إشعار هام'}
                    </span>

                    <button 
                      className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {notif.isRead ? <Check className="w-3 h-3 text-emerald-600" /> : 'تعليم كمقروء'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            إدارة كافة التنبيهات وإعدادات الرسائل
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: ACADEMIC EXCELLENCE, AT-RISK STUDENTS & UPCOMING EXAMS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 9. أفضل الطلاب (Top Students) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">لوحة الطلاب المتفوقين</h3>
                <p className="text-[11px] text-slate-500">أعلى معدلات التحصيل الأكاديمي</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('certificates')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              الشهادات
            </button>
          </div>

          <div className="space-y-3">
            {topStudentsList.map((stu, index) => (
              <div key={stu.id} className="p-3 rounded-2xl bg-gradient-to-r from-amber-50/30 to-slate-50 border border-slate-100 flex items-center justify-between gap-3 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️'}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{stu.name}</h4>
                    <span className="text-[10px] text-slate-500 font-medium block">{stu.className}</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-black border border-amber-200 block">
                    {stu.percentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">المركز {stu.rank}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 10. الطلاب المتعثرون (Struggling Students) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">الطلاب المتعثرون والإنذارات</h3>
                <p className="text-[11px] text-slate-500">حالات بحاجة لمتابعة ودعم أكاديمي عاجل</p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              {strugglingStudentsList.length} حالات
            </span>
          </div>

          <div className="space-y-3">
            {strugglingStudentsList.map(stu => (
              <div 
                key={stu.id} 
                onClick={() => setSelectedStrugglingStudent(stu)}
                className="p-3 rounded-2xl bg-rose-50/40 border border-rose-100 hover:bg-rose-100/60 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{stu.name}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    stu.riskLevel === 'حرج' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    مستوى الخطورة: {stu.riskLevel}
                  </span>
                </div>

                <span className="text-[10px] text-slate-500 font-medium block">{stu.className}</span>

                <p className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-rose-100 leading-snug">
                  ⚠️ {stu.reason}
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('students')}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            عرض سجلات كافة الطلاب وأولياء الأمور
          </button>
        </div>

        {/* 7. الامتحانات القادمة (Upcoming Exams) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">جدول الامتحانات القادمة</h3>
                <p className="text-[11px] text-slate-500">مواعيد الاختبارات النصفية والنهائية</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              الجدول الكامل
            </button>
          </div>

          <div className="space-y-3">
            {upcomingExamsList.map(ex => (
              <div key={ex.id} className="p-3 rounded-2xl bg-indigo-50/30 border border-indigo-100 space-y-1.5 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">{ex.title}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                    باقي {ex.daysLeft} يوم
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-indigo-100/60">
                  <span>{ex.className}</span>
                  <span className="font-bold text-slate-700">{ex.date} - {ex.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: QUICK SHORTCUTS & AUDIT LOGS
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-4">اختصار وتصفح أقسام النظام السريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate('students')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-100 text-center transition-all group cursor-pointer"
          >
            <Users className="w-5 h-5 mx-auto text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 block">شؤون الطلاب</span>
          </button>

          <button
            onClick={() => onNavigate('documents')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-100 text-center transition-all group cursor-pointer"
          >
            <BookOpen className="w-5 h-5 mx-auto text-teal-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 block">مركز الوثائق والملفات</span>
          </button>

          <button
            onClick={() => onNavigate('timetable')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-100 text-center transition-all group cursor-pointer"
          >
            <Calendar className="w-5 h-5 mx-auto text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 block">الجدول والحصص</span>
          </button>

          <button
            onClick={() => onNavigate('grades')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 text-center transition-all group cursor-pointer"
          >
            <FileText className="w-5 h-5 mx-auto text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 block">رصد الدرجات</span>
          </button>

          <button
            onClick={() => onNavigate('financial')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-100 text-center transition-all group cursor-pointer"
          >
            <DollarSign className="w-5 h-5 mx-auto text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 block">المالية والأقساط</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-100 text-center transition-all group cursor-pointer"
          >
            <TrendingUp className="w-5 h-5 mx-auto text-purple-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 block">مركز التقارير</span>
          </button>
        </div>
      </div>

      {/* MODAL: STRUGGLING STUDENT DETAIL */}
      {selectedStrugglingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>ملف متابعة الطالب المتعثر</span>
              </h3>
              <button
                onClick={() => setSelectedStrugglingStudent(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <h4 className="font-bold text-slate-900 text-sm">{selectedStrugglingStudent?.name || ''}</h4>
                <p className="text-slate-500 font-medium mt-0.5">{selectedStrugglingStudent?.className || ''}</p>
                <div className="mt-2 text-rose-800 font-bold">
                  سبب التنبيه: {selectedStrugglingStudent?.reason || ''}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-800">خطة الدعم المقترحة من النظام:</h5>
                <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                  <li>إرسال إشعار فور لولي الأمر وحجز موعد مقابلة.</li>
                  <li>تحديد حصص تقوية مجانية في مادة الرياضيات والفيزياء.</li>
                  <li>متابعة جدول الحضور والغياب اليومي بشكل حثيث.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedStrugglingStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
              >
                إغلاق
              </button>

              <button
                onClick={() => {
                  setSelectedStrugglingStudent(null);
                  onNavigate('students');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs"
              >
                الذهاب لملف الطالب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

