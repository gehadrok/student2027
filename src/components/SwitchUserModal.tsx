import React from 'react';
import { UserRole, User } from '../types';
import { getRealmDB, setCurrentUser } from '../lib/db';
import { Shield, GraduationCap, UserCheck, Users, X, RefreshCw } from 'lucide-react';

interface SwitchUserModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onUserSwitched?: () => void;
  onSelectUser?: (user: User) => void;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen = true,
  onClose,
  onUserSwitched,
  onSelectUser
}) => {
  const db = getRealmDB();

  if (!isOpen) return null;

  const handleSelectRole = (role: UserRole) => {
    const user = db.users.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      onSelectUser?.(user);
      onUserSwitched?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin-slow" />
            <h3 className="text-lg font-bold text-slate-800">تبديل دور المستخدم (للتجربة السريعة MVP)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          يتيح نظام إدارة مدرسة خالد ابن الوليد الضالع/جحاف 4 أدوار أساسية. اختر أي دور لتغيير الصلاحيات واجهة التفاعل فوراً:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Admin */}
          <button
            onClick={() => handleSelectRole('admin')}
            className="p-4 rounded-xl border-2 border-red-100 bg-red-50/50 hover:bg-red-100/60 hover:border-red-300 text-right transition-all flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-red-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">مدير المدرسة (Admin)</span>
              <span className="text-xs font-semibold text-red-600 block mt-0.5">أ. عبدالله الغامدي</span>
              <span className="text-[11px] text-slate-500 block mt-1">صلاحية كاملة: المالية، الطلاب، الجداول، المدرسين</span>
            </div>
          </button>

          {/* Teacher */}
          <button
            onClick={() => handleSelectRole('teacher')}
            className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-300 text-right transition-all flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-blue-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">المعلم (Teacher)</span>
              <span className="text-xs font-semibold text-blue-600 block mt-0.5">أ. محمد العتيبي</span>
              <span className="text-[11px] text-slate-500 block mt-1">رصد الحضور والغياب، إدخال الدرجات، الجدول</span>
            </div>
          </button>

          {/* Student */}
          <button
            onClick={() => handleSelectRole('student')}
            className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100/60 hover:border-emerald-300 text-right transition-all flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">الطالب (Student)</span>
              <span className="text-xs font-semibold text-emerald-600 block mt-0.5">أحمد خالد الدوسري</span>
              <span className="text-[11px] text-slate-500 block mt-1">عرض الجدول، درجاتي، الحضور، الشهادات</span>
            </div>
          </button>

          {/* Parent */}
          <button
            onClick={() => handleSelectRole('parent')}
            className="p-4 rounded-xl border-2 border-purple-100 bg-purple-50/50 hover:bg-purple-100/60 hover:border-purple-300 text-right transition-all flex items-start gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">ولي الأمر (Parent)</span>
              <span className="text-xs font-semibold text-purple-600 block mt-0.5">م. خالد سعد الدوسري</span>
              <span className="text-[11px] text-slate-500 block mt-1">متابعة الأبناء، الدرجات، الرسوم المالية، التواصل</span>
            </div>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
