import React from 'react';
import { getRealmDB, getCurrentUser } from '../lib/db';
import { GraduationCap, Clock, Calendar, Users, BookOpen, CheckCircle2, AlertCircle, ArrowRight, Eye, FileText, Sparkles } from 'lucide-react';

interface TeacherDashboardProps {
  onNavigate: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users[1]; // default teacher
  const teacher = db.teachers?.find(t => t.userId === currentUser.id) || db.teachers?.[0];

  // Assigned classes and subjects
  const assignedSubjects = (teacher?.subjectIds || []).map(sid => db.subjects.find(s => s.id === sid)).filter(Boolean);
  const assignedClasses = (teacher?.classIds || []).map(cid => db.classes.find(c => c.id === cid)).filter(Boolean);

  // Today's schedule for teacher
  const todaySchedule = teacher ? db.schedule.filter(s => s.teacherId === teacher.id) : [];
  const totalStudentsInClasses = teacher && teacher.classIds ? db.students.filter(s => teacher.classIds.includes(s.classId)).length : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
            <GraduationCap className="w-4 h-4" />
            <span>بوابة الهيئة التدريسية والرصد الأكاديمي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            مرحباً بك، الأستاذ / <span className="text-blue-300">{teacher?.name || 'غير معروف'}</span> 👨‍🏫
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            تخصص: <strong className="text-white">{teacher?.specialization || 'عام'}</strong> | المؤهل: {teacher?.qualification || 'جامعي'} | نصاب الحصص: {todaySchedule.length} حصة/أسبوع
          </p>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10">
          <button
            onClick={() => onNavigate('attendance')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>رصد حضور اليوم 🟢</span>
          </button>
          <button
            onClick={() => onNavigate('grades')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>رصد درجات الطلاب 📝</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">عدد الطلاب في فصولي</span>
            <span className="text-2xl font-black text-slate-800 font-mono">{totalStudentsInClasses} طالب</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">المواد والمناهج المسندة</span>
            <span className="text-2xl font-black text-indigo-700 font-mono">{assignedSubjects.length} مقررات</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">الصفوف المخصصة</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{assignedClasses.length} صفوف</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Teacher Schedule & Subjects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>جدولي الدراسي ونصاب الحصص الأسبوعي</span>
            </h3>
            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>عرض الجدول الكامل</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {todaySchedule.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">لا توجد حصص مسجلة في جدولك حالياً</p>
            ) : (
              todaySchedule.map(s => {
                const sub = db.subjects.find(x => x.id === s.subjectId);
                const cls = db.classes.find(x => x.id === s.classId);
                const sec = db.sections.find(x => x.id === s.sectionId);
                return (
                  <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                        {s.periodNumber}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{sub?.name || s.subjectId}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {cls?.name} - {sec?.name} | قاعة: <strong className="font-mono text-slate-700">{sec?.roomNumber || '101'}</strong>
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
                );
              })
            )}
          </div>
        </div>

        {/* Assigned Subjects & Quick Links */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>المقررات والمناهج المكلف بها</span>
            </h3>
            <div className="space-y-2.5">
              {assignedSubjects.map(sub => (
                <div key={sub?.id} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span>{sub?.name}</span>
                  <span className="font-mono text-[10px] bg-indigo-100 px-2 py-0.5 rounded">{sub?.code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2 font-black text-sm">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span>مساعد المعلم الذكي (AI Assistant)</span>
            </div>
            <p className="text-xs text-amber-100 leading-relaxed">
              استخدم زر الذكاء الاصطناعي في الشريط العلوي لتحليل درجات فصلك، أو توليد أسئلة اختبار قصيرة مخصصة لمقَررِك باللغة العربية في ثوانٍ!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
