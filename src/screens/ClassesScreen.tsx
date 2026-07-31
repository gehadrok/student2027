import React, { useState } from 'react';
import { SchoolClass, Section } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog } from '../lib/db';
import { Layers, Plus, Edit, Trash2, Users, Home, BookOpen, UserCheck, Shield, CheckCircle } from 'lucide-react';

export const ClassesScreen: React.FC = () => {
  const db = getRealmDB();
  const [classes, setClasses] = useState<SchoolClass[]>(db.classes);
  const [sections, setSections] = useState<Section[]>(db.sections);

  // Class Modal
  const [showClassModal, setShowClassModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState(10);

  // Section Modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [secName, setSecName] = useState('');
  const [secClassId, setSecClassId] = useState(classes[0]?.id || '');
  const [secRoom, setSecRoom] = useState('');
  const [secCapacity, setSecCapacity] = useState(25);
  const [secSupervisor, setSecSupervisor] = useState(db.teachers[0]?.id || '');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    const newDb = getRealmDB();
    const newC: SchoolClass = {
      id: `c_${Date.now()}`,
      name: className,
      level: Number(classLevel),
      sections: []
    };
    newDb.classes.push(newC);
    saveRealmDB(newDb);
    setClasses(newDb.classes);
    addAuditLog("إضافة صف دراسي", `تم إضافة المستوى الدراسي (${className})`);
    setClassName('');
    setShowClassModal(false);
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName.trim()) return;
    const newDb = getRealmDB();
    const newSec: Section = {
      id: `sec_${Date.now()}`,
      name: secName,
      classId: secClassId,
      roomNumber: secRoom || "101",
      capacity: Number(secCapacity),
      supervisorTeacherId: secSupervisor || undefined
    };
    newDb.sections.push(newSec);
    const parentClass = newDb.classes.find(x => x.id === secClassId);
    if (parentClass) parentClass.sections.push(newSec);
    
    saveRealmDB(newDb);
    setSections(newDb.sections);
    setClasses(newDb.classes);
    addAuditLog("إضافة شعبة جديدة", `تم إنشاء (${secName}) وتخصيص القاعة ${secRoom}`);
    setSecName('');
    setShowSectionModal(false);
  };

  const handleDeleteSection = (sid: string, sName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشعبة (${sName})؟`)) return;
    const newDb = getRealmDB();
    newDb.sections = newDb.sections.filter(s => s.id !== sid);
    newDb.classes.forEach(c => {
      c.sections = c.sections.filter(s => s.id !== sid);
    });
    saveRealmDB(newDb);
    setSections(newDb.sections);
    setClasses(newDb.classes);
    addAuditLog("حذف شعبة", `تم حذف الشعبة (${sName}) من النظام`);
  };

  const getTeacherName = (tid?: string) => {
    if (!tid) return 'غير محدد';
    return db.teachers.find(t => t.id === tid)?.name || 'غير محدد';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">إدارة الصفوف الدراسية والشُّعب</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تنظيم المراحل الدراسية، توزيع القاعات، تحديد الطاقة الاستيعابية، وتعيين رواد الفصول
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSecClassId(classes[0]?.id || ''); setShowSectionModal(true); }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شعبة جديدة</span>
          </button>
          <button
            onClick={() => setShowClassModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صف (مستوى)</span>
          </button>
        </div>
      </div>

      {/* Classes & Sections List */}
      <div className="space-y-6">
        {classes.map(cls => {
          const clsSections = sections.filter(sec => sec.classId === cls.id);
          const totalStudentsInClass = db.students.filter(s => s.classId === cls.id).length;

          return (
            <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                    {cls.level}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{cls.name}</h3>
                    <span className="text-xs text-slate-500 font-medium">المستوى الدراسي: {cls.level} | إجمالي طلاب الصف: {totalStudentsInClass}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                  {clsSections.length} شُعب دراسية
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clsSections.length === 0 ? (
                  <p className="col-span-full py-6 text-center text-xs text-slate-400">لا توجد شعب منشأة داخل هذا الصف بعد</p>
                ) : (
                  clsSections.map(sec => {
                    const stuCount = db.students.filter(s => s.sectionId === sec.id).length;
                    const occupancy = Math.round((stuCount / sec.capacity) * 100);

                    return (
                      <div key={sec.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{sec.name}</h4>
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                              <Home className="w-3.5 h-3.5 text-slate-400" />
                              قاعة رقم: <strong className="font-mono text-slate-700">{sec.roomNumber}</strong>
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteSection(sec.id, sec.name)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف الشعبة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Supervisor Teacher */}
                        <div className="p-2 rounded-lg bg-slate-50 text-[11px] flex items-center justify-between">
                          <span className="text-slate-500">رائد الفصل (المشرف):</span>
                          <span className="font-bold text-indigo-700">{getTeacherName(sec.supervisorTeacherId)}</span>
                        </div>

                        {/* Capacity Bar */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-500">الطلاب المسجلون:</span>
                            <span className="font-bold text-slate-800">{stuCount} / {sec.capacity} طالب</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${occupancy > 90 ? 'bg-red-500' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min(occupancy, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Class */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">إضافة مستوى / صف دراسي جديد</h3>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الصف الدراسي</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="مثال: الصف الأول المتوسط"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المستوى الرقمي (Level)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={12}
                  value={classLevel}
                  onChange={(e) => setClassLevel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowClassModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">إنشاء الصف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Section */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">إضافة شعبة / فصل دراسي جديد</h3>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الصف التابعة له</label>
                <select
                  value={secClassId}
                  onChange={(e) => setSecClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الشعبة أو القسم</label>
                <input
                  type="text"
                  required
                  value={secName}
                  onChange={(e) => setSecName(e.target.value)}
                  placeholder="مثال: شعبة أ (مسار علوم وهندسة)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم القاعة</label>
                  <input
                    type="text"
                    required
                    value={secRoom}
                    onChange={(e) => setSecRoom(e.target.value)}
                    placeholder="101"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الطاقة الاستيعابية</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={50}
                    value={secCapacity}
                    onChange={(e) => setSecCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">رائد الفصل (المعلم المشرف)</label>
                <select
                  value={secSupervisor}
                  onChange={(e) => setSecSupervisor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">بدون مشرف حالياً</option>
                  {db.teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">إنشاء الشعبة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
