import React from 'react';
import { getRealmDB, getCurrentUser } from '../lib/db';
import { BookOpen, Calendar, Clock, UserCheck, Award, TrendingUp, Heart, CheckCircle2, AlertCircle, ArrowRight, Sparkles, FileText } from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users?.[2]; // default student
  const stuId = currentUser?.linkedStudentIds?.[0] || "s1";
  const student = db.students?.find(s => s.id === stuId) || db.students?.[0];

  // Schedule for student's section
  const stuSchedule = student ? db.schedule.filter(s => s.classId === student.classId && s.sectionId === student.sectionId) : [];

  // Grades & attendance stats
  const stuGrades = student ? db.grades.filter(g => g.studentId === student.id) : [];
  const totalMax = stuGrades.reduce((sum, g) => sum + g.maxScore, 0);
  const totalObtained = stuGrades.reduce((sum, g) => sum + g.score, 0);
  const averagePct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 94;

  const stuAtt = student ? db.attendance.filter(a => a.studentId === student.id) : [];
  const presentCount = stuAtt.filter(a => a.status === 'present').length;
  const attPct = stuAtt.length > 0 ? Math.round((presentCount / stuAtt.length) * 100) : 98;

  const getClassName = (cid?: string) => (cid ? db.classes.find(c => c.id === cid)?.name || cid : '');
  const getSectionName = (sid?: string) => (sid ? db.sections.find(sec => sec.id === sid)?.name || sid : '');
  const getSubjectName = (sid?: string) => (sid ? db.subjects.find(s => s.id === sid)?.name || sid : '');
  const getTeacherName = (tid?: string) => (tid ? db.teachers.find(t => t.id === tid)?.name || tid : '');

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Student Profile Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-2xl flex items-center justify-center shadow-lg">
            {student?.name ? student.name.charAt(0) : 'ط'}
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
              <span>{student?.academicId || '2026-001'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              أهلاً بك، الطالب / <span className="text-emerald-300">{student?.name || 'الطالب'}</span> 🎓
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {getClassName(student?.classId)} - {getSectionName(student?.sectionId)} | المرشد الأكاديمي: د. عبد الخالق آل إبراهيم
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10">
          <button
            onClick={() => onNavigate('grades')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>عرض سجل درجاتي 📊</span>
          </button>
          <button
            onClick={() => onNavigate('library')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>المكتبة واستعاراتي 📚</span>
          </button>
          <button
            onClick={() => onNavigate('certificates')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>طباعة كشف العلامات 📜</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المعدل العام التراكمي (GPA)</span>
            <span className="text-2xl font-black text-blue-600 font-mono">{averagePct}%</span>
            <span className="text-[10px] text-emerald-600 font-bold ml-1">({averagePct >= 90 ? 'ممتاز مرتفع A+' : 'جيد جداً'})</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">نسبة مواظبة الحضور</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{attPct}%</span>
            <span className="text-[10px] text-slate-400 block">{presentCount} يوم حضور منتظم</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">الحالة الصحية والخاصة</span>
            <span className="text-sm font-black text-slate-800">{student.healthNotes || 'حالة صحية ممتازة 💚'}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center font-bold">
            <Heart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Timetable and Recent Grades Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>جدول الحصص الأسبوعي لفصلي ({getSectionName(student.sectionId)})</span>
            </h3>
            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>الجدول الشامل</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {stuSchedule.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">لا توجد حصص مسجلة في جدول فصلك حالياً</p>
            ) : (
              stuSchedule.map(s => (
                <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                      {s.periodNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{getSubjectName(s.subjectId)}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        المعلم المحاضر: <strong className="text-slate-700">{getTeacherName(s.teacherId)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-left font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold">
                      {s.day}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">{s.startTime} - {s.endTime}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Grades summary & AI Tips */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span>أحدث التقييمات المرصودة</span>
              </h3>
            </div>
            <div className="space-y-2.5">
              {stuGrades.slice(0, 5).map(g => {
                const subName = getSubjectName(g.subjectId);
                const p = Math.round((g.score / g.maxScore) * 100);
                return (
                  <div key={g.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-800 block">{subName}</strong>
                      <span className="text-[10px] text-slate-400">{g.type === 'midterm' ? 'منتصف الفصل' : 'اختبار قصير'}</span>
                    </div>
                    <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                      {g.score}/{g.maxScore} <span className="text-[9px]">({p}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2 font-black text-sm text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>نصيحة المستشار الذكي (Gemini AI)</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              أداؤك في الرياضيات والعلوم ممتاز جداً! ننصحك بمراجعة تمارين الفيزياء الكهربائية هذا الأسبوع لتحافظ على معدل 94% وأعلى. استمر في التميز!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
