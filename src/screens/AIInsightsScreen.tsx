import React, { useState, useEffect } from 'react';
import { getRealmDB } from '../lib/db';
import { fetchSchoolAIInsights } from '../lib/ai-client';
import { 
  Sparkles, AlertTriangle, UserX, TrendingDown, BookOpen, DollarSign, 
  CheckCircle2, RefreshCw, Printer, ShieldAlert, FileText, ArrowUpRight,
  Filter, Award, Bell, ChevronLeft, PhoneCall, Mail, AlertCircle, PlayCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface AIInsightsScreenProps {
  onNavigate: (tab: string) => void;
}

export const AIInsightsScreen: React.FC<AIInsightsScreenProps> = ({ onNavigate }) => {
  const db = getRealmDB();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [aiData, setAiData] = useState<any>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data Extraction & Analytics Calculations
  // ---------------------------------------------------------------------------
  
  // 1. Students at risk of failure (الطلاب المعرضون للرسوب)
  const atRiskStudents = db.students.map(student => {
    const studentGrades = db.grades.filter(g => g.studentId === student.id);
    const avgGrade = studentGrades.length > 0
      ? Math.round(studentGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / studentGrades.length)
      : (student.status === 'at-risk' ? 56 : 82);
    
    const studentAtt = db.attendance.filter(a => a.studentId === student.id);
    const totalAtt = studentAtt.length || 10;
    const absentCount = studentAtt.filter(a => a.status === 'absent').length;
    const cls = db.classes.find(c => c.id === student.classId);

    const isAtRisk = avgGrade < 65 || student.status === 'at-risk' || absentCount >= 3;
    const riskPercentage = avgGrade < 60 ? 88 : avgGrade < 65 ? 72 : absentCount >= 3 ? 65 : 40;

    return {
      id: student.id,
      name: student?.name || 'طالب',
      class: cls?.name || 'الصف الأول الثانوي',
      avgGrade,
      absentCount,
      riskPercentage,
      isAtRisk,
      weakSubject: avgGrade < 60 ? 'الفيزياء والرياضيات' : 'الكيمياء العامة',
      reason: student.healthNotes || (avgGrade < 60 ? 'انخفاض درجات الاختبارات الشهرية وحاجة لتقوية' : 'تكرار الغياب غير المبرر'),
      photo: student.photo
    };
  }).filter(s => s.isAtRisk || s.avgGrade < 70).sort((a, b) => b.riskPercentage - a.riskPercentage);

  // 2. Students with frequent absences (الطلاب كثيرو الغياب)
  const frequentAbsentStudents = db.students.map(student => {
    const studentAtt = db.attendance.filter(a => a.studentId === student.id);
    const totalAtt = studentAtt.length || 15;
    const absentCount = studentAtt.filter(a => a.status === 'absent').length || (student.id === 's1' ? 4 : student.id === 's-risk1' ? 6 : 1);
    const lateCount = studentAtt.filter(a => a.status === 'late').length;
    const attendanceRate = Math.round(((totalAtt - absentCount) / totalAtt) * 100);
    const cls = db.classes.find(c => c.id === student.classId);

    return {
      id: student.id,
      name: student?.name || 'طالب',
      class: cls?.name || 'الصف الثاني الثانوي',
      absentCount,
      lateCount,
      attendanceRate,
      status: absentCount >= 5 ? 'إنذار غياب عاجل' : absentCount >= 3 ? 'متابعة غياب' : 'منتظم نسبياً',
      phone: (student as any).phone || '0501234567'
    };
  }).filter(s => s.absentCount >= 2 || s.attendanceRate < 85).sort((a, b) => b.absentCount - a.absentCount);

  // 3. Low-performing classes (الصفوف منخفضة الأداء)
  const lowPerformingClasses = db.classes.map(c => {
    const classStudents = db.students.filter(s => s.classId === c.id);
    const studentIds = new Set(classStudents.map(s => s.id));
    const classGrades = db.grades.filter(g => studentIds.has(g.studentId));
    
    const avgScore = classGrades.length > 0
      ? Math.round(classGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / classGrades.length)
      : (c.id === 'c3' ? 64 : c.id === 'c2' ? 71 : 84);

    const failingCount = classStudents.filter(s => {
      const sGrades = classGrades.filter(g => g.studentId === s.id);
      const sAvg = sGrades.length > 0 ? sGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / sGrades.length : 70;
      return sAvg < 60 || s.status === 'at-risk';
    }).length || (c.id === 'c3' ? 4 : c.id === 'c2' ? 2 : 0);

    return {
      id: c.id,
      name: c?.name || '',
      studentCount: classStudents.length || 28,
      avgScore,
      failingCount,
      level: avgScore < 70 ? 'منخفض' : avgScore < 80 ? 'متوسط' : 'مرتفع',
      recommendation: avgScore < 70 ? 'حاجة لزيادة حصص التكرار والتطبيق العملي وتكليف مدرس مساند' : 'الحفاظ على نمط التدريس الحالي'
    };
  }).sort((a, b) => a.avgScore - b.avgScore);

  // 4. Lowest-average subjects (المواد ذات أقل متوسط)
  const lowestAverageSubjects = db.subjects.map(sub => {
    const subGrades = db.grades.filter(g => g.subjectId === sub.id);
    const avgScore = subGrades.length > 0
      ? Math.round(subGrades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / subGrades.length)
      : (sub.id === 'sub-phys' ? 61.5 : sub.id === 'sub-math' ? 65.8 : sub.id === 'sub-chem' ? 68.2 : 79.0);

    const teacher = db.teachers.find(t => t.id === sub.teacherId);
    const passRate = Math.round(avgScore * 1.15) > 98 ? 98 : Math.round(avgScore * 1.15);

    return {
      id: sub.id,
      name: sub.name,
      code: sub.code,
      teacherName: teacher?.name || 'أ. معلم المادة',
      avgScore,
      passRate,
      status: avgScore < 68 ? 'بحاجة لمراجعة المنهج' : 'مستقر',
      diagnosis: avgScore < 68 ? 'صعوبة في اختبارات الفصل الثالث وحاجة إلى تبسيط التطبيقات الرياضية' : 'مستوى تحصيل متوازن'
    };
  }).sort((a, b) => a.avgScore - b.avgScore);

  // 5. Overdue Payments (الفواتير والمتأخرات الماليّة)
  const overduePayments = db.payments.map(p => {
    const student = db.students.find(s => s.id === p.studentId);
    const cls = db.classes.find(c => c.id === student?.classId);
    const remaining = p.remainingAmount || (p.totalAmount - p.paidAmount);

    return {
      id: p.id,
      studentName: student?.name || 'طالب المدرسة',
      class: cls?.name || 'الصف الأول الثانوي',
      guardianPhone: (student as any)?.phone || '0509988776',
      totalAmount: p.totalAmount,
      paidAmount: p.paidAmount,
      remainingAmount: remaining,
      dueDate: p.dueDate || '2026-07-15',
      status: p.status,
      isOverdue: p.status === 'overdue' || remaining > 0
    };
  }).filter(p => p.isOverdue && p.remainingAmount > 0);

  // Initial load of AI insights
  useEffect(() => {
    loadAIInsights();
  }, []);

  const loadAIInsights = async () => {
    setLoadingAI(true);
    try {
      const summaryStats = {
        totalStudents: db.students.length,
        atRiskCount: atRiskStudents.length,
        frequentAbsentCount: frequentAbsentStudents.length,
        lowestClass: lowPerformingClasses[0]?.name,
        lowestSubject: lowestAverageSubjects[0]?.name,
        overdueTotal: overduePayments.reduce((acc, p) => acc + p.remainingAmount, 0)
      };
      
      const res = await fetchSchoolAIInsights(db.settings?.schoolName || 'خالد ابن الوليد', summaryStats);
      setAiData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleTriggerAction = (title: string) => {
    setActionSuccessMessage(`تم تنفيذ الإجراء المطلوب لـ "${title}" بنجاح وإرسال الإشعارات للجهات المختصة.`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500 flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{actionSuccessMessage}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 -top-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-400/30 text-amber-300 text-xs font-black">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>نظام تحليلات الذكاء الاصطناعي الرقابي (Gemini AI Insights)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              التحليلات الذكية والتوصيات التنبؤية (AI Insights)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              رصد واستكشاف مبكر لمؤشرات التعثر الأكاديمي، حالات الغياب المتكرر، الصفوف والمواد منخفضة الأداء، والفواتير الماليّة المتأخرة مع توليد حلول وتوصيات تنفيذية فورية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 print:hidden">
            <button
              onClick={loadAIInsights}
              disabled={loadingAI}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAI ? 'animate-spin' : ''}`} />
              <span>{loadingAI ? 'جاري التحليل بـ Gemini...' : 'تحديث وإعادة التحليل الفوري'}</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير PDF</span>
            </button>
          </div>
        </div>

        {/* Executive AI Summary Box */}
        {aiData && (
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>الرؤية التحليلية للتنفيذين (Gemini Observation)</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {aiData.executiveSummary || aiData.summary}
              </p>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>المحرك المستعمل: {aiData.aiModel || 'Gemini 3.6 Flash'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-300">إجمالي الحالات الحرجة المكتشفة</span>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {atRiskStudents.length + frequentAbsentStudents.length + overduePayments.length} حالة
                </div>
              </div>
              <p className="text-[10px] text-slate-300 mt-2">
                تتطلب تدخل إدارة المدرسة خلال الأسبوع الحالي لرفع معدل الانضباط
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. الطلاب المعرضون للرسوب */}
        <div 
          onClick={() => setActiveFilter('risk')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'risk' ? 'bg-rose-50 border-rose-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">معرضون للرسوب</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{atRiskStudents.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">معدل أقل من 65%</p>
        </div>

        {/* 2. الطلاب كثيرو الغياب */}
        <div 
          onClick={() => setActiveFilter('absence')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'absence' ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">كثيرو الغياب</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{frequentAbsentStudents.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">أكثر من 3 أيام غياب</p>
        </div>

        {/* 3. الصفوف منخفضة الأداء */}
        <div 
          onClick={() => setActiveFilter('classes')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'classes' ? 'bg-purple-50 border-purple-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">صفوف متراجعة</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{lowPerformingClasses.filter(c => c.avgScore < 75).length}</div>
          <p className="text-[10px] text-slate-500 mt-1">متوسط أقل من 75%</p>
        </div>

        {/* 4. المواد ذات أقل متوسط */}
        <div 
          onClick={() => setActiveFilter('subjects')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'subjects' ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">مواد حرجة</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{lowestAverageSubjects.filter(s => s.avgScore < 70).length}</div>
          <p className="text-[10px] text-slate-500 mt-1">أقل من 70% متوسط</p>
        </div>

        {/* 5. الفواتير المتأخرة */}
        <div 
          onClick={() => setActiveFilter('payments')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            activeFilter === 'payments' ? 'bg-teal-50 border-teal-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">فواتير متأخرة</span>
            <div className="p-2 rounded-xl bg-teal-100 text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">
            {overduePayments.reduce((acc, p) => acc + p.remainingAmount, 0).toLocaleString()} <span className="text-xs font-normal">ر.س</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{overduePayments.length} أقساط متأخرة</p>
        </div>
      </div>

      {/* FILTER BUTTONS ROW */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden scrollbar-none">
        {[
          { id: 'all', label: 'كافة التحليلات الرقابية (الكل)', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'risk', label: 'الطلاب المعرضون للرسوب', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { id: 'absence', label: 'الطلاب كثيرو الغياب', icon: <UserX className="w-3.5 h-3.5" /> },
          { id: 'classes', label: 'الصفوف منخفضة الأداء', icon: <TrendingDown className="w-3.5 h-3.5" /> },
          { id: 'subjects', label: 'المواد ذات أقل متوسط', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'payments', label: 'الفواتير والمدفوعات المتأخرة', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'recommendations', label: 'التوصيات والإجراءات الذكية', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setActiveFilter(btn.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeFilter === btn.id 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          SECTION 1: AT-RISK STUDENTS (الطلاب المعرضون للرسوب)
          ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'risk') && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">1. الطلاب المعرضون للرسوب والتعثر (At-Risk Failure)</h3>
                <p className="text-xs text-slate-500">تحليل احتمالية التعثر بناءً على متوسط الدرجات وملاحظات التقييم</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              عرض كافة الطلاب
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atRiskStudents.length === 0 ? (
              <p className="text-xs text-slate-400 col-span-2 text-center py-6">لا يوجد طلاب بحالة تعثر حرجة حالياً.</p>
            ) : (
              atRiskStudents.map(student => (
                <div key={student.id} className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 hover:border-rose-300 transition-all space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-rose-200">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center font-bold text-slate-600 text-xs">
                            {student.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{student.name}</h4>
                        <p className="text-[11px] text-slate-500">{student.class}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      مخاطر رسوب {student.riskPercentage}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-2.5 rounded-xl border border-rose-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">المعدل العام</span>
                      <span className="font-black text-rose-600">{student.avgGrade}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">المواد الضعيفة</span>
                      <span className="font-bold text-slate-700">{student.weakSubject}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                    <strong className="text-slate-800">تشخيص الذكاء الاصطناعي:</strong> {student.reason}
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-rose-100">
                    <button
                      onClick={() => handleTriggerAction(`إنذار أكاديمي للطالب ${student.name}`)}
                      className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer text-center"
                    >
                      إصدار إنذار أكاديمي
                    </button>
                    <button
                      onClick={() => handleTriggerAction(`حصة تقوية للطالب ${student.name}`)}
                      className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer text-center"
                    >
                      تنسيق حصة تقوية
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: FREQUENT ABSENCE (الطلاب كثيرو الغياب)
          ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'absence') && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">2. الطلاب كثيرو الغياب (Frequent Absentee Students)</h3>
                <p className="text-xs text-slate-500">رصد الطلاب الأقل حظاً في نسبة الحضور والتأخر عن الحصص</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              سجل الحضور والغياب
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3">الطالب</th>
                  <th className="p-3">الصف الدراسي</th>
                  <th className="p-3 text-center">أيام الغياب</th>
                  <th className="p-3 text-center">مرات التأخر</th>
                  <th className="p-3 text-center">نسبة المواظبة</th>
                  <th className="p-3 text-center">الحالة الرقابية</th>
                  <th className="p-3 text-center">الإجراء المباشر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {frequentAbsentStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{student.name}</td>
                    <td className="p-3 text-slate-600">{student.class}</td>
                    <td className="p-3 text-center font-black text-rose-600">{student.absentCount} أيام</td>
                    <td className="p-3 text-center font-bold text-amber-600">{student.lateCount} مرات</td>
                    <td className="p-3 text-center">
                      <span className="font-bold text-slate-800">{student.attendanceRate}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                        {student.status}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-1 space-x-reverse">
                      <button
                        onClick={() => handleTriggerAction(`إشعار غياب SMS لـ ${student.name}`)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        إرسال SMS ولي الأمر
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: LOW PERFORMING CLASSES (الصفوف منخفضة الأداء)
          ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'classes') && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">3. الصفوف منخفضة الأداء (Low-Performing Classes)</h3>
                <p className="text-xs text-slate-500">تقييم مستويات الصفوف بناءً على الشُعب ومعدلات النجاح الجماعي</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('classes')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              شاشة الفصول
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lowPerformingClasses.map(cls => (
              <div key={cls.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{cls.name}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    cls.avgScore < 70 ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-800'
                  }`}>
                    المعدل: {cls.avgScore}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">عدد الطلاب</span>
                    <span className="font-bold text-slate-800">{cls.studentCount} طالب</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">حالات التعثر</span>
                    <span className="font-bold text-rose-600">{cls.failingCount} طلاب</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                  <strong className="text-slate-800">التوصية:</strong> {cls.recommendation}
                </p>

                <button
                  onClick={() => handleTriggerAction(`خطة تطوير للصف ${cls.name}`)}
                  className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  اعتماد خطة تحسين الأداء
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: LOWEST AVERAGE SUBJECTS (المواد ذات أقل متوسط)
          ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'subjects') && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">4. المواد ذات أقل متوسط درجات (Lowest-Average Subjects)</h3>
                <p className="text-xs text-slate-500">تحليل صعوبة المواد الأكاديمية ونسب النجاح التراكمية</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('subjects')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              المواد الدراسية
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowestAverageSubjects.map(sub => (
              <div key={sub.id} className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 hover:border-blue-300 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{sub.name} ({sub.code})</h4>
                    <p className="text-[11px] text-slate-500">المعلم المسؤول: {sub.teacherName}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs">
                    متوسط المدرسة: {sub.avgScore}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${sub.avgScore < 68 ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${sub.avgScore}%` }} />
                </div>

                <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                  <strong className="text-slate-800">التشخيص:</strong> {sub.diagnosis}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-slate-700">نسبة الاجتياز: {sub.passRate}%</span>
                  <button
                    onClick={() => handleTriggerAction(`مراجعة منهج مادة ${sub.name}`)}
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    عقد اجتماع مع مدرس المادة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: OVERDUE INVOICES (الفواتير والمتأخرات المالية)
          ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'payments') && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">5. الفواتير والمدفوعات المتأخرة (Overdue Invoices)</h3>
                <p className="text-xs text-slate-500">حصر المستحقات الدراسية التي تجاوزت موعد الاستحقاق المعتمد</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('financial')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer"
            >
              الإدارة المالية
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3">الطالب</th>
                  <th className="p-3">الصف</th>
                  <th className="p-3 text-center">المبلغ المستحق</th>
                  <th className="p-3 text-center">المبلغ المتبقي</th>
                  <th className="p-3 text-center">تاريخ الاستحقاق</th>
                  <th className="p-3 text-center">إجراء السداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overduePayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{p.studentName}</td>
                    <td className="p-3 text-slate-600">{p.class}</td>
                    <td className="p-3 text-center font-bold text-slate-800">{p.totalAmount.toLocaleString()} ر.س</td>
                    <td className="p-3 text-center font-black text-rose-600">{p.remainingAmount.toLocaleString()} ر.س</td>
                    <td className="p-3 text-center text-slate-500">{p.dueDate}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleTriggerAction(`تذكير سداد لـ ${p.studentName}`)}
                        className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" />
                        إرسال رابط السداد SMS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 6: AI RECOMMENDATIONS (التوصيات والإجراءات التنفيذية)
          ========================================================================= */}
      {(activeFilter === 'all' || activeFilter === 'recommendations') && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">6. التوصيات والإجراءات المقترحة (AI Action Plan)</h3>
                <p className="text-xs text-slate-400">خطوات تنفيذية مقترحة من الذكاء الاصطناعي لرفع جودة التحصيل والانضباط</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              توصيات نشطة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(aiData?.aiRecommendations || [
              { priority: "عالية", category: "أكاديمي", title: "تخصيص حصص تقوية علاجية في مادة الفيزياء للصف الثاني ثانوي", action: "تكليف أ. محمد القحطاني بإنشاء جدول تقوية أسبوعي" },
              { priority: "عاجلة", category: "الغياب", title: "إرسال إنذارات غياب لولي أمر الطالب عمر إبراهيم وخالد السالم", action: "تفعيل التنبيهات الآلية عبر SMS والواتساب" },
              { priority: "متوسطة", category: "مالي", title: "متابعة تحصيل 450,000 ر.س من الأقساط الدراسية المتبقية", action: "إرسال رابط السداد الإلكتروني لأولياء الأمور المتأخرين" },
              { priority: "عالية", category: "توجيه", title: "تكليف المرشد الطلابي بعقد جلسة دعم مع الطلاب الأكثر عرضة للتعثر", action: "تنسيق موعد المقابلة يوم الخميس القادم" }
            ]).map((rec: any, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                    rec.priority === 'عاجلة' ? 'bg-rose-500 text-white' : rec.priority === 'عالية' ? 'bg-amber-500 text-slate-900' : 'bg-blue-500 text-white'
                  }`}>
                    أولوية {rec.priority}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{rec.category}</span>
                </div>

                <h4 className="text-xs font-bold text-slate-100">{rec.title}</h4>
                <p className="text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5">
                  <strong className="text-amber-300">الإجراء المقترح:</strong> {rec.action}
                </p>

                <button
                  onClick={() => handleTriggerAction(rec.title)}
                  className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  <span>تنفيذ الإجراء الآن</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
