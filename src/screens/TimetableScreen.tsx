import React, { useState, useEffect } from 'react';
import { SchedulePeriod, DayOfWeek } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog, getCurrentUser } from '../lib/db';
import { checkTimetableConflicts } from '../lib/ai-client';
import { Calendar, Plus, Trash2, Sparkles, AlertTriangle, CheckCircle2, RefreshCw, Filter, Clock } from 'lucide-react';

const DAYS: DayOfWeek[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIOD_TIMES = [
  { p: 1, start: '07:30', end: '08:15' },
  { p: 2, start: '08:20', end: '09:05' },
  { p: 3, start: '09:20', end: '10:05' },
  { p: 4, start: '10:10', end: '10:55' },
  { p: 5, start: '11:00', end: '11:45' },
  { p: 6, start: '11:50', end: '12:35' },
  { p: 7, start: '12:40', end: '01:25' }
];

export const TimetableScreen: React.FC = () => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users[0];
  const [schedule, setSchedule] = useState<SchedulePeriod[]>(db.schedule);

  // Filters
  const [viewMode, setViewMode] = useState<'by-class' | 'by-teacher'>('by-class');
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || 'c3');
  const [selectedSectionId, setSelectedSectionId] = useState(db.classes[0]?.sections[0]?.id || 'sec4');
  const [selectedTeacherId, setSelectedTeacherId] = useState(db.teachers[0]?.id || 't1');

  // AI conflict checks state
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checkingAI, setCheckingAI] = useState(false);

  // Modal Add/Edit Slot
  const [showModal, setShowModal] = useState(false);
  const [targetDay, setTargetDay] = useState<DayOfWeek>('الأحد');
  const [targetPeriod, setTargetPeriod] = useState<number>(1);
  const [formSubjectId, setFormSubjectId] = useState(db.subjects[0]?.id || '');
  const [formTeacherId, setFormTeacherId] = useState(db.teachers[0]?.id || '');

  useEffect(() => {
    runAIConflictCheck();
  }, [schedule]);

  const runAIConflictCheck = async () => {
    setCheckingAI(true);
    try {
      const res = await checkTimetableConflicts(schedule, db.teachers, db.classes);
      setConflicts(res.conflicts || []);
      setSuggestions(res.suggestions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingAI(false);
    }
  };

  const handleOpenSlotModal = (day: DayOfWeek, period: number) => {
    if (currentUser.role !== 'admin') return;
    setTargetDay(day);
    setTargetPeriod(period);
    setFormSubjectId(db.subjects[0]?.id || '');
    setFormTeacherId(db.teachers[0]?.id || '');
    setShowModal(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const newDb = getRealmDB();
    const timeInfo = PERIOD_TIMES.find(t => t.p === targetPeriod) || { start: '07:30', end: '08:15' };

    // Remove old slot in that cell if exists for this class/section
    newDb.schedule = newDb.schedule.filter(s =>
      !(s.classId === selectedClassId && s.sectionId === selectedSectionId && s.day === targetDay && s.periodNumber === targetPeriod)
    );

    const newSlot: SchedulePeriod = {
      id: `sch_${Date.now()}`,
      classId: selectedClassId,
      sectionId: selectedSectionId,
      subjectId: formSubjectId,
      teacherId: formTeacherId,
      day: targetDay,
      periodNumber: targetPeriod,
      startTime: timeInfo.start,
      endTime: timeInfo.end
    };

    newDb.schedule.push(newSlot);
    saveRealmDB(newDb);
    setSchedule(newDb.schedule);
    addAuditLog("تعديل جدول دراسي", `تم تحديث الحصة ${targetPeriod} يوم ${targetDay}`);
    setShowModal(false);
  };

  const handleDeleteSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'admin') return;
    const newDb = getRealmDB();
    newDb.schedule = newDb.schedule.filter(s => s.id !== id);
    saveRealmDB(newDb);
    setSchedule(newDb.schedule);
    addAuditLog("حذف حصة دراسية", "تم إزالة الحصة من جدول الفصل");
  };

  const getSubjectName = (sid: string) => db.subjects.find(s => s.id === sid)?.name || sid;
  const getTeacherName = (tid: string) => db.teachers.find(t => t.id === tid)?.name || tid;
  const getClassName = (cid: string) => db.classes.find(c => c.id === cid)?.name || cid;

  const getSlot = (day: DayOfWeek, period: number) => {
    if (viewMode === 'by-class') {
      return schedule.find(s =>
        s.classId === selectedClassId &&
        s.sectionId === selectedSectionId &&
        s.day === day &&
        s.periodNumber === period
      );
    } else {
      return schedule.find(s =>
        s.teacherId === selectedTeacherId &&
        s.day === day &&
        s.periodNumber === period
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">منشئ الجداول الدراسية الذكي (Timetable Builder)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              عرض الجداول حسب الفصول والشعب أو المعلمين مع الكشف الآلي الفوري عن أي تعارضات زمنية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runAIConflictCheck}
            disabled={checkingAI}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-sm hover:from-amber-600 hover:to-amber-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{checkingAI ? 'جاري فحص التعارضات...' : 'فحص التعارض بالذكاء الاصطناعي'}</span>
          </button>
        </div>
      </div>

      {/* AI Conflict Detection Alert Box */}
      {conflicts.length > 0 ? (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/60 text-white shadow-lg animate-pulse">
          <div className="flex items-center gap-2 font-bold text-sm mb-2 text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>تم رصد تعارض في الجدول الدراسي: ({conflicts.length} حالات)</span>
          </div>
          <ul className="list-disc pr-5 text-xs space-y-1 text-red-100 mb-3">
            {conflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
          {suggestions.length > 0 && (
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 text-xs text-amber-200 font-medium">
              💡 {suggestions[0]}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>الجدول الدراسي متوازن وسليم. لم يتم كشف أي تعارضات أو تضارب في القاعات والحصص.</span>
          </div>
          {suggestions[0] && <span className="hidden md:inline text-[11px] text-emerald-300/80">{suggestions[0]}</span>}
        </div>
      )}

      {/* Selector and Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('by-class')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'by-class' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            عرض حسب الصف والشعبة
          </button>
          <button
            onClick={() => setViewMode('by-teacher')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'by-teacher' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            عرض حسب المعلم (نصاب الحصص)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'by-class' ? (
            <>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  const cls = db.classes.find(x => x.id === e.target.value);
                  if (cls && cls.sections[0]) setSelectedSectionId(cls.sections[0].id);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {db.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {db.sections.filter(sec => sec.classId === selectedClassId).map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name} (قاعة {sec.roomNumber})</option>
                ))}
              </select>
            </>
          ) : (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {db.teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Visual Timetable Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3.5 border border-slate-800 font-bold text-center w-28 bg-slate-950">اليوم / الحصة</th>
                {PERIOD_TIMES.map(pt => (
                  <th key={pt.p} className="p-3.5 border border-slate-800 text-center font-bold min-w-[130px]">
                    <div className="text-sm text-amber-400">الحصة {pt.p}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{pt.start} - {pt.end}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => (
                <tr key={day} className="divide-x divide-slate-200 hover:bg-slate-50/50 transition-colors">
                  <td className="p-3.5 border border-slate-200 bg-slate-100 font-black text-slate-800 text-center">
                    {day}
                  </td>
                  {PERIOD_TIMES.map(pt => {
                    const slot = getSlot(day, pt.p);
                    return (
                      <td
                        key={pt.p}
                        onClick={() => handleOpenSlotModal(day, pt.p)}
                        className={`p-2 border border-slate-200 h-24 align-top relative transition-all ${
                          currentUser.role === 'admin' ? 'cursor-pointer hover:bg-indigo-50/50' : ''
                        }`}
                      >
                        {slot ? (
                          <div className="w-full h-full p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm flex flex-col justify-between relative group">
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={(e) => handleDeleteSlot(slot.id, e)}
                                className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/20 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all"
                                title="حذف الحصة"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            <div>
                              <p className="font-bold text-xs leading-tight">{getSubjectName(slot.subjectId)}</p>
                              <p className="text-[10px] text-indigo-100 mt-1">
                                {viewMode === 'by-class' ? `👨‍🏫 ${getTeacherName(slot.teacherId)}` : `🏫 ${getClassName(slot.classId)}`}
                              </p>
                            </div>
                            <span className="text-[9px] text-indigo-200 font-mono self-end">
                              {slot.startTime}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:border-indigo-300 transition-colors">
                            {currentUser.role === 'admin' && <Plus className="w-5 h-5 opacity-40" />}
                          </div>
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

      {/* Modal Add/Edit Slot */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">
              تخصيص الحصة {targetPeriod} يوم ({targetDay})
            </h3>
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المادة الدراسية</label>
                <select
                  value={formSubjectId}
                  onChange={(e) => {
                    setFormSubjectId(e.target.value);
                    const sub = db.subjects.find(x => x.id === e.target.value);
                    if (sub && sub.teacherId) setFormTeacherId(sub.teacherId);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {db.subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المعلم المحاضر</label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {db.teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">تثبيت الحصة في الجدول</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
