
import { AttendanceRecord, AttendanceStatus, AppNotification } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog, getCurrentUser } from '../lib/db';
import { UserCheck, Calendar, Search, CheckCircle2, XCircle, Clock, AlertCircle, Check, Send, Filter, Bell } from 'lucide-react';

export const AttendanceScreen: React.FC = () => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users?.[0] || { id: 'u1', name: 'المدير', role: 'admin' as const };
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-27');
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || 'c3');
  const [selectedSectionId, setSelectedSectionId] = useState(db.classes[0]?.sections[0]?.id || 'sec4');
  const [search, setSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const studentsInSection = db.students.filter(s => {
    if (currentUser.role === 'teacher') {
      const t = db.teachers.find(x => x.userId === currentUser.id);
      if (t && (!t.classIds || !t.classIds.includes(s.classId))) return false;
    }
    if (currentUser.role === 'parent') {
      const p = db.parents.find(x => x.userId === currentUser.id);
      if (p && (!p.studentIds || !p.studentIds.includes(s.id))) return false;
    }
    const matchesClass = s.classId === selectedClassId && s.sectionId === selectedSectionId;
    const matchesSearch = s.name.includes(search) || s.academicId.includes(search);
    return matchesClass && matchesSearch;
  });

  const getAttendanceForStudent = (stuId: string): AttendanceStatus => {
    const rec = db.attendance.find(a => a.studentId === stuId && a.date === selectedDate);
    return rec?.status || 'present';
  };

  const handleStatusChange = (stuId: string, status: AttendanceStatus) => {
    if (currentUser.role === 'student' || currentUser.role === 'parent') return; // Read-only for students/parents
    const newDb = getRealmDB();
    const stu = newDb.students.find(s => s.id === stuId);
    const existingIdx = newDb.attendance.findIndex(a => a.studentId === stuId && a.date === selectedDate);

    if (existingIdx !== -1) {
      newDb.attendance[existingIdx].status = status;
      newDb.attendance[existingIdx].recordedBy = currentUser?.name || 'مستخدم النظام';
    } else {
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}_${stuId}`,
        studentId: stuId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
        status,
        recordedBy: currentUser?.name || 'مستخدم النظام'
      };
      newDb.attendance.push(newRec);
    }

    // Trigger parent alert if absent!
    if (status === 'absent' && stu) {
      const newNotif: AppNotification = {
        id: `notif_abs_${Date.now()}`,
        userId: stu.parentId === "p1" ? "u4" : undefined,
        title: `إشعار غياب فوري: الطالب ${stu.name}`,
        message: `نحيطكم علماً بأن الطالب تغيب عن الحصص الدراسية ليوم ${selectedDate}. يرجى تزويد إدارة المدرسة بالعذر الطبي.`,
        type: 'danger',
        isRead: false,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      newDb.notifications.unshift(newNotif);
    }

    saveRealmDB(newDb);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleMarkAllPresent = () => {
    if (currentUser.role === 'student' || currentUser.role === 'parent') return;
    const newDb = getRealmDB();
    studentsInSection.forEach(stu => {
      const existingIdx = newDb.attendance.findIndex(a => a.studentId === stu.id && a.date === selectedDate);
      if (existingIdx !== -1) {
        newDb.attendance[existingIdx].status = 'present';
        newDb.attendance[existingIdx].recordedBy = currentUser?.name || 'مستخدم النظام';
      } else {
        newDb.attendance.push({
          id: `att_${Date.now()}_${stu.id}`,
          studentId: stu.id,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          date: selectedDate,
          status: 'present',
          recordedBy: currentUser?.name || 'مستخدم النظام'
        });
      }
    });
    saveRealmDB(newDb);
    addAuditLog("تسجيل حضور جماعي", `تم تحضير كافة طلاب الفصل ليوم ${selectedDate}`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">سجل الحضور والغياب اليومي والتنبيهات الفورية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              رصد الغياب، إرسال إشعارات لحظية لأولياء الأمور عند الغياب أو التأخر، ومتابعة الانضباط
            </p>
          </div>
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
          <button
            onClick={handleMarkAllPresent}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تحضير الكل (حاضر) 🟢</span>
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">تم حفظ تعديلات الحضور بنجاح! وتم إرسال تنبيهات الغياب التلقائية.</span>
        </div>
      )}

      {/* Selector Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-600">التاريخ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              const cls = db.classes.find(x => x.id === e.target.value);
              if (cls && cls.sections[0]) setSelectedSectionId(cls.sections[0].id);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {db.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {db.sections.filter(sec => sec.classId === selectedClassId).map(sec => (
              <option key={sec.id} value={sec.id}>{sec.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">الرقم الأكاديمي</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">ولي الأمر والجوال</th>
                <th className="py-3 px-4 text-center">حالة الحضور ليوم ({selectedDate})</th>
                <th className="py-3 px-4 text-center">تنبيه ولي الأمر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentsInSection.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">لا يوجد طلاب في هذه الشعبة</td>
                </tr>
              ) : (
                studentsInSection.map(stu => {
                  const status = getAttendanceForStudent(stu.id);
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{stu.academicId}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 text-sm">{stu.name}</p>
                        {stu.healthNotes && <span className="text-[10px] text-amber-600">⚠ {stu.healthNotes}</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{stu.parentName} ({stu.parentPhone})</td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, 'present')}
                            disabled={currentUser.role === 'student' || currentUser.role === 'parent'}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            حاضر 🟢
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, 'absent')}
                            disabled={currentUser.role === 'student' || currentUser.role === 'parent'}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              status === 'absent'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            غائب 🔴
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, 'late')}
                            disabled={currentUser.role === 'student' || currentUser.role === 'parent'}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              status === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            متأخر 🟡
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(stu.id, 'excused')}
                            disabled={currentUser.role === 'student' || currentUser.role === 'parent'}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              status === 'excused'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            بعذر 🔵
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {status === 'absent' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-700 font-bold text-[10px] animate-pulse">
                            <Bell className="w-3 h-3" /> أرسل تنبيه فوري
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">حالة انضباط منتظمة</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
