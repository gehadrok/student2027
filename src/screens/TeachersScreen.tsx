import React, { useState } from 'react';
import { Teacher } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog } from '../lib/db';
import { GraduationCap, Search, Plus, Edit, Trash2, Mail, Phone, BookOpen, Award, CheckCircle2, Eye, User, ArrowRight } from 'lucide-react';
import TeacherProfileDashboard from '../components/TeacherProfileDashboard';

export const TeachersScreen: React.FC = () => {
  const db = getRealmDB();
  const [teachers, setTeachers] = useState<Teacher[]>(db.teachers);
  const [search, setSearch] = useState('');

  // Selected Teacher Profile Modal
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Modal Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState(5);
  const [status, setStatus] = useState<'active' | 'on-leave'>('active');

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditTeacher(null);
    setName('');
    setEmail('teacher.new@alsalam.edu');
    setPhone('0500000000');
    setSpecialization('الرياضيات');
    setQualification('بكالوريوس تربوي');
    setExperience(3);
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditTeacher(t);
    setName(t.name);
    setEmail(t.email);
    setPhone(t.phone);
    setSpecialization(t.specialization);
    setQualification(t.qualification);
    setExperience(t.experienceYears);
    setStatus(t.status);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newDb = getRealmDB();

    if (editTeacher) {
      const idx = newDb.teachers.findIndex(x => x.id === editTeacher.id);
      if (idx !== -1) {
        newDb.teachers[idx] = {
          ...editTeacher,
          name, email, phone, specialization, qualification, experienceYears: Number(experience), status
        };
      }
      addAuditLog("تعديل بيانات معلم", `تم تحديث ملف المعلم (${name})`);
    } else {
      const newT: Teacher = {
        id: `t_${Date.now()}`,
        userId: `u_t_${Date.now()}`,
        name,
        email,
        phone,
        specialization,
        qualification,
        experienceYears: Number(experience),
        subjectIds: [],
        classIds: [newDb.classes[0]?.id || "c1"],
        status
      };
      newDb.teachers.push(newT);
      addAuditLog("تسجيل معلم جديد", `تم إضافة المعلم (${name}) - تخصص ${specialization}`);
    }

    saveRealmDB(newDb);
    setTeachers(newDb.teachers);
    setShowModal(false);
  };

  const handleDelete = (id: string, tName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المعلم (${tName})؟`)) return;
    const newDb = getRealmDB();
    newDb.teachers = newDb.teachers.filter(t => t.id !== id);
    saveRealmDB(newDb);
    setTeachers(newDb.teachers);
    addAuditLog("حذف معلم", `تم حذف المعلم (${tName}) من النظام`);
  };

  const getSubjectNames = (subIds?: string[]) => {
    return (subIds || []).map(id => db.subjects.find(s => s.id === id)?.name || id).join('، ');
  };

  // Render Teacher Dashboard full-screen mode (hiding teachers grid)
  if (selectedTeacher) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
        {/* Top Back Navigation Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <button
            onClick={() => setSelectedTeacher(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span>الرجوع إلى قائمة المعلمين</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>ملف المعلم الشخصي (Dashboard) - {selectedTeacher.name}</span>
          </div>
        </div>

        {/* Dashboard component */}
        <TeacherProfileDashboard
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
          onEdit={(tc) => {
            setSelectedTeacher(null);
            handleOpenEdit(tc);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">إدارة شؤون المعلمين والهيئة التدريسية</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة التخصصات العلمية، سنوات الخبرة والمؤهلات، وتوزيع نصاب الحصص الدراسية
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة معلم جديد</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المعلم أو التخصص العلمي..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 px-3">
          عدد المعلمين: {filteredTeachers.length}
        </span>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeachers.map(t => {
          const subjectsCount = (t.subjectIds || []).length;
          const classesCount = (t.classIds || []).length;
          const scheduleCount = db.schedule.filter(s => s.teacherId === t.id).length;

          return (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                      {t.name.charAt(2) || t.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{t.name}</h3>
                      <span className="text-xs font-semibold text-blue-600 block">{t.specialization}</span>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">{t.qualification}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(t)} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-50">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id, t.name)} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{t.email}</span>
                  </div>
                </div>

                {/* Subjects Assigned */}
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">المواد المسندة له:</span>
                  <div className="flex flex-wrap gap-1">
                    {(!t.subjectIds || t.subjectIds.length === 0) ? (
                      <span className="text-[10px] text-slate-400">لم تسند مواد بعد</span>
                    ) : (
                      t.subjectIds.map(sid => {
                        const sName = db.subjects.find(s => s.id === sid)?.name || sid;
                        return (
                          <span key={sid} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                            {sName}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Footer & Profile Button */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-1.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px]">الخبرة</span>
                    <span className="font-black text-slate-700">{t.experienceYears} سنوات</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px]">نصاب الحصص</span>
                    <span className="font-black text-indigo-700">{scheduleCount} حصة/أسبوع</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-[10px]">الحالة</span>
                    <span className={`font-bold ${t.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {t.status === 'active' ? 'على رأس العمل' : 'إجازة'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTeacher(t)}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>عرض الملف الشامل للمعلم (Dashboard)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit Teacher */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b">
              {editTeacher ? `تعديل بيانات المعلم (${editTeacher.name})` : 'إضافة معلم جديد'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المعلم الرباعي</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أ. محمد العتيبي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم الجوال</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">التخصص العلمي</label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="مثال: الرياضيات والفيزياء"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">سنوات الخبرة</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={40}
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">المؤهل الأكاديمي</label>
                <input
                  type="text"
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="مثال: ماجستير مناهج وطرق تدريس"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
