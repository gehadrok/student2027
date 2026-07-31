import React, { useState } from 'react';
import { Subject } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog } from '../lib/db';
import { BookOpen, Plus, Edit, Trash2, Clock, Award, Users } from 'lucide-react';

export const SubjectsScreen: React.FC = () => {
  const db = getRealmDB();
  const [subjects, setSubjects] = useState<Subject[]>(db.subjects);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  // Form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [classId, setClassId] = useState(db.classes[0]?.id || '');
  const [teacherId, setTeacherId] = useState(db.teachers[0]?.id || '');
  const [hours, setHours] = useState(4);
  const [maxScore, setMaxScore] = useState(100);

  const handleOpenAdd = () => {
    setEditSubject(null);
    setName('');
    setCode('SUB-101');
    setClassId(db.classes[0]?.id || '');
    setTeacherId(db.teachers[0]?.id || '');
    setHours(4);
    setMaxScore(100);
    setShowModal(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditSubject(s);
    setName(s.name);
    setCode(s.code);
    setClassId(s.classId);
    setTeacherId(s.teacherId);
    setHours(s.weeklyHours);
    setMaxScore(s.maxScore);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newDb = getRealmDB();

    if (editSubject) {
      const idx = newDb.subjects.findIndex(x => x.id === editSubject.id);
      if (idx !== -1) {
        newDb.subjects[idx] = {
          ...editSubject,
          name, code, classId, teacherId, weeklyHours: Number(hours), maxScore: Number(maxScore)
        };
      }
      addAuditLog("تعديل مادة دراسية", `تم تحديث مادة (${name})`);
    } else {
      const newS: Subject = {
        id: `sub_${Date.now()}`,
        name,
        code,
        classId,
        teacherId,
        weeklyHours: Number(hours),
        maxScore: Number(maxScore),
        passScore: Number(maxScore) * 0.5,
        color: "#2563eb"
      };
      newDb.subjects.push(newS);
      
      // Also link to teacher
      const t = newDb.teachers.find(x => x.id === teacherId);
      if (t) {
        if (!t.subjectIds) t.subjectIds = [];
        if (!t.subjectIds.includes(newS.id)) t.subjectIds.push(newS.id);
      }

      addAuditLog("إضافة مادة دراسية", `تم إضافة المادة (${name}) للصف رقم ${classId}`);
    }

    saveRealmDB(newDb);
    setSubjects(newDb.subjects);
    setShowModal(false);
  };

  const handleDelete = (id: string, sName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المادة (${sName})؟`)) return;
    const newDb = getRealmDB();
    newDb.subjects = newDb.subjects.filter(s => s.id !== id);
    saveRealmDB(newDb);
    setSubjects(newDb.subjects);
    addAuditLog("حذف مادة دراسية", `تم حذف المادة (${sName})`);
  };

  const getClassName = (cid: string) => db.classes.find(c => c.id === cid)?.name || cid;
  const getTeacherName = (tid: string) => db.teachers.find(t => t.id === tid)?.name || 'غير محدد';

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">إدارة المواد والمناهج الدراسية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد المقررات، ربطها بالصفوف والمعلمين، أوزان الدرجات، وساعات التدريس الأسبوعية
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مادة جديدة</span>
        </button>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map(sub => {
          return (
            <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px] font-bold">
                      {sub.code}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base mt-1.5">{sub.name}</h3>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">{getClassName(sub.classId)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(sub)} className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-slate-50">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(sub.id, sub.name)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assigned Teacher */}
                <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                    {getTeacherName(sub.teacherId).charAt(2) || 'أ'}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block">المعلم المسؤول:</span>
                    <span className="font-bold text-slate-800 truncate block">{getTeacherName(sub.teacherId)}</span>
                  </div>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-xl bg-slate-50 flex items-center justify-center gap-1.5 font-bold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>{sub.weeklyHours} حصص/أسبوع</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 flex items-center justify-center gap-1.5 font-bold text-slate-700">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>الدرجة العظمى: {sub.maxScore}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit Subject */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">
              {editSubject ? `تعديل المادة (${editSubject.name})` : 'إضافة مادة دراسية جديدة'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المادة</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: الفيزياء الكهربائية"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رمز المادة (Code)</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PHYS-301"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الصف الدراسي</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {db.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ساعات التدريس الأسبوعية</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الدرجة العظمى</label>
                  <input
                    type="number"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المعلم المسؤول عن المادة</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {db.teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold">حفظ المادة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
