import React, { useState } from 'react';
import { Student } from '../types';
import { getRealmDB, saveRealmDB, addAuditLog, getCurrentUser } from '../lib/db';
import { Users, Search, Plus, Edit, Trash2, Eye, Phone, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import StudentProfileDashboard from '../components/StudentProfileDashboard';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../components/common/ToastContext';

export const StudentsScreen: React.FC = () => {
  const db = getRealmDB();
  const currentUser = getCurrentUser() || db.users[0];
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>(db.students);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Profile View state
  const [selectedProfile, setSelectedProfile] = useState<Student | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formAcademicId, setFormAcademicId] = useState('');
  const [formClassId, setFormClassId] = useState(db.classes[0]?.id || '');
  const [formSectionId, setFormSectionId] = useState(db.classes[0]?.sections[0]?.id || '');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('2008-05-10');
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formStatus, setFormStatus] = useState<'active' | 'transferred' | 'graduated' | 'at-risk'>('active');
  const [formHealthNotes, setFormHealthNotes] = useState('');

  const filterStudents = students.filter(s => {
    if (currentUser.role === 'teacher') {
      const teacher = db.teachers.find(t => t.userId === currentUser.id);
      if (teacher && (!teacher.classIds || !teacher.classIds.includes(s.classId))) return false;
    }
    if (currentUser.role === 'parent') {
      const parent = db.parents.find(p => p.userId === currentUser.id);
      if (parent && (!parent.studentIds || !parent.studentIds.includes(s.id))) return false;
    }
    const matchesSearch = s.name.includes(search) || s.academicId.toLowerCase().includes(search.toLowerCase()) || s.parentName.includes(search);
    const matchesClass = classFilter === 'all' || s.classId === classFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditStudent(null);
    setFormName('');
    setFormAcademicId(`STU-2026-${100 + students.length + 1}`);
    setFormClassId(db.classes[0]?.id || '');
    setFormSectionId(db.classes[0]?.sections[0]?.id || '');
    setFormParentName('');
    setFormParentPhone('');
    setFormStatus('active');
    setFormHealthNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditStudent(s);
    setFormName(s.name);
    setFormAcademicId(s.academicId);
    setFormClassId(s.classId);
    setFormSectionId(s.sectionId);
    setFormParentName(s.parentName);
    setFormParentPhone(s.parentPhone);
    setFormBirthDate(s.birthDate);
    setFormGender(s.gender);
    setFormStatus(s.status);
    setFormHealthNotes(s.healthNotes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAcademicId.trim()) return;

    const newDb = getRealmDB();
    if (editStudent) {
      const idx = newDb.students.findIndex(x => x.id === editStudent.id);
      if (idx !== -1) {
        newDb.students[idx] = {
          ...editStudent,
          name: formName,
          academicId: formAcademicId,
          classId: formClassId,
          sectionId: formSectionId,
          parentName: formParentName,
          parentPhone: formParentPhone,
          birthDate: formBirthDate,
          gender: formGender,
          status: formStatus,
          healthNotes: formHealthNotes
        };
      }
      addAuditLog("تعديل بيانات طالب", `تم تحديث ملف الطالب (${formName}) - رقم أكاديمي ${formAcademicId}`);
      showToast(`تم تحديث بيانات الطالب (${formName}) بنجاح`, 'success');
    } else {
      const newStu: Student = {
        id: `s_${Date.now()}`,
        userId: `u_stu_${Date.now()}`,
        academicId: formAcademicId,
        name: formName,
        classId: formClassId,
        sectionId: formSectionId,
        parentId: "p1",
        parentName: formParentName || "ولي أمر الطالب",
        parentPhone: formParentPhone || "0500000000",
        birthDate: formBirthDate,
        gender: formGender,
        status: formStatus,
        healthNotes: formHealthNotes,
        enrollmentDate: new Date().toISOString().substring(0, 10)
      };
      newDb.students.push(newStu);
      addAuditLog("إضافة طالب جديد", `تم تسجيل الطالب (${formName}) بالصف الدراسي رقم ${formClassId}`);
      showToast(`تم إضافة الطالب (${formName}) بنجاح إلى النظام`, 'success');
    }

    saveRealmDB(newDb);
    setStudents(newDb.students);
    setShowModal(false);
  };

  const confirmDeleteStudent = () => {
    if (!deleteTarget) return;
    const newDb = getRealmDB();
    newDb.students = newDb.students.filter(x => x.id !== deleteTarget.id);
    saveRealmDB(newDb);
    setStudents(newDb.students);
    addAuditLog("حذف طالب", `تم حذف الطالب (${deleteTarget.name}) من قاعدة البيانات`);
    showToast(`تم حذف الطالب (${deleteTarget.name}) بنجاح`, 'info');
    setDeleteTarget(null);
  };

  const handleOpenProfile = (s: Student) => {
    setSelectedProfile(s);
  };

  const getClassName = (cid: string) => db.classes.find(c => c.id === cid)?.name || cid;
  const getSectionName = (sid: string) => db.sections.find(sec => sec.id === sid)?.name || sid;

  // Render Student Dashboard full-screen mode (hiding students table)
  if (selectedProfile) {
    return (
      <div className="space-y-4 animate-in fade-in duration-200" dir="rtl">
        {/* Top Back Navigation Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <button
            onClick={() => setSelectedProfile(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>الرجوع إلى قائمة الطلاب</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>ملف الطالب الشخصي (Dashboard) - {selectedProfile.name}</span>
          </div>
        </div>

        {/* Dashboard component */}
        <StudentProfileDashboard
          student={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onEdit={(st) => {
            setSelectedProfile(null);
            handleOpenEdit(st);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">إدارة شؤون الطلاب وملفات التعريف</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              عرض الكشوفات، توزيع الفصول والشعب، رصد التنبيهات الصحية، وتحليلات الذكاء الاصطناعي
            </p>
          </div>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل طالب جديد</span>
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب، الرقم الأكاديمي، أو اسم ولي الأمر..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">كل الصفوف الدراسية</option>
            {db.classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">كافة الحالات</option>
            <option value="active">منتظم دراسياً (🟢)</option>
            <option value="at-risk">بحاجة لدعم / متعثر (🔴)</option>
            <option value="transferred">منقول (🔵)</option>
            <option value="graduated">متخرج (🎓)</option>
          </select>
        </div>
      </div>

      {/* Students Grid/Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">الرقم والأكاديمي</th>
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">الصف والشعبة</th>
                <th className="py-3 px-4">ولي الأمر والجوال</th>
                <th className="py-3 px-4">الحالة والمتابعة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filterStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <EmptyState
                      type="search"
                      title="لا توجد نتائج مطابقة للبحث"
                      description="لم نتمكن من العثور على أي طالب يطابق معايير البحث أو الفلترة المختارة."
                      actionLabel={currentUser.role === 'admin' ? "تسجيل طالب جديد" : undefined}
                      onAction={currentUser.role === 'admin' ? handleOpenAdd : undefined}
                    />
                  </td>
                </tr>
              ) : (
                filterStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">
                      {s.academicId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold flex items-center justify-center text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                          <span className="text-[10px] text-slate-400">{s.gender === 'male' ? 'طالب' : 'طالبة'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-700">{getClassName(s.classId)}</p>
                      <span className="text-[11px] text-blue-600 font-medium">{getSectionName(s.sectionId)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-700">{s.parentName}</p>
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.parentPhone}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      {s.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> منتظم دراسياً
                        </span>
                      ) : s.status === 'at-risk' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold text-[11px]">
                          <ShieldAlert className="w-3 h-3" /> متعثر / دعم
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px]">
                          {s.status === 'transferred' ? 'منقول' : 'خريج'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenProfile(s)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                          title="عرض الملف الشامل وتحليلات الذكاء الاصطناعي"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>الملف والتحليل</span>
                        </button>

                        {currentUser.role === 'admin' && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="تعديل بيانات الطالب"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="حذف الطالب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {editStudent ? `تعديل بيانات الطالب (${editStudent.name})` : 'تسجيل طالب جديد في النظام'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم الطالب الرباعي</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: أحمد خالد الدوسري"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الرقم الأكاديمي</label>
                  <input
                    type="text"
                    required
                    value={formAcademicId}
                    onChange={(e) => setFormAcademicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الصف الدراسي</label>
                  <select
                    value={formClassId}
                    onChange={(e) => {
                      setFormClassId(e.target.value);
                      const cls = db.classes.find(x => x.id === e.target.value);
                      if (cls && cls.sections[0]) setFormSectionId(cls.sections[0].id);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {db.classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الشعبة (Section)</label>
                  <select
                    value={formSectionId}
                    onChange={(e) => setFormSectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {db.sections.filter(sec => sec.classId === formClassId).map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم ولي الأمر</label>
                  <input
                    type="text"
                    required
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="مثال: م. خالد سعد الدوسري"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">رقم جوال ولي الأمر</label>
                  <input
                    type="text"
                    required
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="0500000000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الجنس</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="male">ذكر (طالب)</option>
                    <option value="female">أنثى (طالبة)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الحالة الأكاديمية</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="active">منتظم دراسياً</option>
                    <option value="at-risk">بحاجة لدعم / متعثر</option>
                    <option value="transferred">منقول إلى مدرسة أخرى</option>
                    <option value="graduated">متخرج</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات صحية أو خاصة (اختياري)</label>
                <textarea
                  rows={2}
                  value={formHealthNotes}
                  onChange={(e) => setFormHealthNotes(e.target.value)}
                  placeholder="مثال: حساسية موسمية، أو ضعف نظر يطلب جلوسه في الصفوف الأمامية..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {editStudent ? 'حفظ التعديلات' : 'تسجيل الطالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="تأكيد حذف طالب من النظام"
        message={`هل أنت متأكد من رغبتك في حذف الطالب (${deleteTarget?.name})؟ سيتم إلغاء كافة بيانات السجل والدرجات المرتبطة به.`}
        confirmLabel="حذف الطالب فوراً"
        cancelLabel="إلغاء الأمر"
        variant="danger"
        onConfirm={confirmDeleteStudent}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
