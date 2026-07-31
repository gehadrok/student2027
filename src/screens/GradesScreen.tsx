import React, { useState } from 'react';
import { GradeRecord, GradeType } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog, getCurrentUser } from '../lib/db';
import { BookOpen, Plus, Edit, Trash2, Search, Award, CheckCircle2, Filter, FileText, TrendingUp } from 'lucide-react';

export const GradesScreen: React.FC = () => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users[0];
  const [grades, setGrades] = useState<GradeRecord[]>(db.grades);
  const [selectedClassId, setSelectedClassId] = useState(db.classes[0]?.id || 'c3');
  const [selectedSubjectId, setSelectedSubjectId] = useState(db.subjects[0]?.id || 'sub1');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editGrade, setEditGrade] = useState<GradeRecord | null>(null);

  // Form
  const [formStudentId, setFormStudentId] = useState('');
  const [formTerm, setFormTerm] = useState<'الفصل الأول' | 'الفصل الثاني' | 'الفصل الصيفي'>('الفصل الأول');
  const [formType, setFormType] = useState<GradeType>('midterm');
  const [formScore, setFormScore] = useState(25);
  const [formMaxScore, setFormMaxScore] = useState(30);
  const [formWeight, setFormWeight] = useState(30);
  const [formNotes, setFormNotes] = useState('');

  const studentsInClass = db.students.filter(s => s.classId === selectedClassId);

  const filteredGrades = grades.filter(g => {
    if (currentUser.role === 'student') return g.studentId === currentUser.linkedStudentIds?.[0] || g.studentId === "s1";
    if (currentUser.role === 'parent') return currentUser.linkedStudentIds?.includes(g.studentId);
    if (currentUser.role === 'teacher') {
      const t = db.teachers.find(x => x.userId === currentUser.id);
      if (t && (!t.subjectIds || !t.subjectIds.includes(g.subjectId))) return false;
    }
    const stu = db.students.find(x => x.id === g.studentId);
    if (!stu || stu.classId !== selectedClassId) return false;
    const matchesSubject = g.subjectId === selectedSubjectId;
    const matchesSearch = stu.name.includes(search) || stu.academicId.includes(search);
    return matchesSubject && matchesSearch;
  });

  const handleOpenAdd = () => {
    if (studentsInClass.length === 0) {
      alert("لا يوجد طلاب مسجلون في هذا الصف حالياً.");
      return;
    }
    setEditGrade(null);
    setFormStudentId(studentsInClass[0]?.id || '');
    setFormTerm('الفصل الأول');
    setFormType('midterm');
    setFormScore(28);
    setFormMaxScore(30);
    setFormWeight(30);
    setFormNotes('أداء ممتاز');
    setShowModal(true);
  };

  const handleOpenEdit = (g: GradeRecord) => {
    setEditGrade(g);
    setFormStudentId(g.studentId);
    setFormTerm(g.term);
    setFormType(g.type);
    setFormScore(g.score);
    setFormMaxScore(g.maxScore);
    setFormWeight(g.weight);
    setFormNotes(g.teacherNotes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newDb = getRealmDB();

    if (editGrade) {
      const idx = newDb.grades.findIndex(x => x.id === editGrade.id);
      if (idx !== -1) {
        newDb.grades[idx] = {
          ...editGrade,
          studentId: formStudentId,
          term: formTerm,
          type: formType,
          score: Number(formScore),
          maxScore: Number(formMaxScore),
          weight: Number(formWeight),
          teacherNotes: formNotes
        };
      }
      addAuditLog("تعديل درجة طالب", `تم تعديل درجة الطالب في مادة ${getSubjectName(selectedSubjectId)}`);
    } else {
      const newG: GradeRecord = {
        id: `g_${Date.now()}`,
        studentId: formStudentId,
        subjectId: selectedSubjectId,
        term: formTerm,
        type: formType,
        score: Number(formScore),
        maxScore: Number(formMaxScore),
        weight: Number(formWeight),
        date: new Date().toISOString().substring(0, 10),
        teacherNotes: formNotes
      };
      newDb.grades.push(newG);
      addAuditLog("رصد درجة جديدة", `تم إدخال درجة ${formScore}/${formMaxScore} للطالب في مادة ${getSubjectName(selectedSubjectId)}`);
    }

    saveRealmDB(newDb);
    setGrades(newDb.grades);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الدرجة؟")) return;
    const newDb = getRealmDB();
    newDb.grades = newDb.grades.filter(g => g.id !== id);
    saveRealmDB(newDb);
    setGrades(newDb.grades);
    addAuditLog("حذف درجة", "تم حذف تقييم من سجل المادة");
  };

  const getStudentName = (sid: string) => db.students.find(s => s.id === sid)?.name || sid;
  const getSubjectName = (sid: string) => db.subjects.find(s => s.id === sid)?.name || sid;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">سجل رصد الدرجات والتقييم الفصلي (Gradebook)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              رصد درجات الاختبارات القصيرة، منتظم الفصل، والنهائي مع احتساب المعدل والأوزان التراكمية
            </p>
          </div>
        </div>

        {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>رصد درجة جديدة</span>
          </button>
        )}
      </div>

      {/* Selector and Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {db.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {db.subjects.filter(s => s.classId === selectedClassId).map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
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

      {/* Grades Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">نوع التقييم</th>
                <th className="py-3 px-4">الفصل الدراسي</th>
                <th className="py-3 px-4 text-center">الدرجة المكتسبة</th>
                <th className="py-3 px-4 text-center">الوزن التراكمي</th>
                <th className="py-3 px-4">ملاحظات المعلم</th>
                {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                  <th className="py-3 px-4 text-center">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">لا توجد درجات مرصودة لهذه المادة بعد</td>
                </tr>
              ) : (
                filteredGrades.map(g => {
                  const pct = Math.round((g.score / g.maxScore) * 100);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                        {getStudentName(g.studentId)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          g.type === 'final' ? 'bg-purple-100 text-purple-700' : g.type === 'midterm' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {g.type === 'final' ? 'اختبار نهائي 📝' : g.type === 'midterm' ? 'اختبار منتظم الفصل 📊' : 'اختبار قصير / كويز ⚡'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{g.term}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                          pct >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          pct >= 75 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {g.score} / {g.maxScore} <span className="text-[10px] font-normal">({pct}%)</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                        {g.weight}%
                      </td>
                      <td className="py-3 px-4 text-slate-500">{g.teacherNotes || '—'}</td>
                      {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleOpenEdit(g)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(g.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Grade */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">
              {editGrade ? 'تعديل الدرجة المرصودة' : 'رصد درجة جديدة في التقييم'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اختر الطالب</label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {studentsInClass.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academicId})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">نوع التقييم</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="quiz">اختبار قصير / كويز</option>
                    <option value="midterm">اختبار منتصف الفصل</option>
                    <option value="final">اختبار نهائي</option>
                    <option value="coursework">أعمال الفصل والمشاركة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الفصل الدراسي</label>
                  <select
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="الفصل الأول">الفصل الأول</option>
                    <option value="الفصل الثاني">الفصل الثاني</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدرجة المكتسبة</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min={0}
                    max={formMaxScore}
                    value={formScore}
                    onChange={(e) => setFormScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدرجة العظمى</label>
                  <input
                    type="number"
                    required
                    value={formMaxScore}
                    onChange={(e) => setFormMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الوزن التراكمي %</label>
                  <input
                    type="number"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات أو توصية الأستاذ</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: إجابة نموذجية، يحتاج مراجعة المسائل..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">حفظ الدرجة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
