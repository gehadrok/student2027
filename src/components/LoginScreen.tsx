import React, { useState } from 'react';
import { User, SchoolSettings } from '../types';
import { getRealmDB, setCurrentUser, addAuditLog } from '../lib/db';
import { Shield, GraduationCap, UserCheck, Users, Lock, Mail, ArrowLeft, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  settings: SchoolSettings;
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ settings, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const db = getRealmDB();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (!user) {
        setError('البريد الإلكتروني أو الحساب غير موجود في النظام.');
        setLoading(false);
        return;
      }

      // Hashed password check simulation
      if (user.passwordHash !== `hash_${password}` && password !== '123456') {
        setError('كلمة المرور غير صحيحة. (استخدم 123456 للتجربة)');
        setLoading(false);
        return;
      }

      if (user.status === 'suspended') {
        setError('هذا الحساب موقوف حالياً من قبل الإدارة.');
        setLoading(false);
        return;
      }

      user.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 16);
      setCurrentUser(user);
      onLoginSuccess(user);
      setLoading(false);
    }, 500);
  };

  const handleQuickDemoLogin = (role: 'admin' | 'teacher' | 'student' | 'parent') => {
    const demoUser = db.users.find(u => u.role === role);
    if (demoUser) {
      demoUser.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 16);
      setCurrentUser(demoUser);
      onLoginSuccess(demoUser);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSuccess(true);
    addAuditLog("استرجاع كلمة المرور", `طلب إعادة تعيين كلمة المرور للحساب: ${forgotEmail}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100" dir="rtl">
      {/* Decorative background blur circles */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {settings?.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt={settings.schoolName}
            className="w-16 h-16 rounded-2xl object-contain bg-white p-2 border border-slate-700 shadow-xl mx-auto mb-4"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-500/30 mx-auto mb-4">
            خ
          </div>
        )}
        <h2 className="text-3xl font-black tracking-tight text-white">
          {settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          بوابة الدخول الموحدة لإدارة العملية التعليمية بالذكاء الاصطناعي
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl py-8 px-6 sm:px-10 backdrop-blur-xl">
          {/* Quick Demo Login Cards for MVP Evaluation */}
          <div className="mb-8 pb-8 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4 flex items-center justify-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              الدخول السريع لتجربة كافة الأدوار (Demo Accounts)
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="p-3 rounded-xl bg-slate-800 hover:bg-red-950/50 hover:border-red-500/50 border border-slate-700 text-center transition-all group flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 block">مدير المدرسة</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">صلاحية كاملة</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('teacher')}
                className="p-3 rounded-xl bg-slate-800 hover:bg-blue-950/50 hover:border-blue-500/50 border border-slate-700 text-center transition-all group flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 block">المعلم</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">أ. محمد العتيبي</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('student')}
                className="p-3 rounded-xl bg-slate-800 hover:bg-emerald-950/50 hover:border-emerald-500/50 border border-slate-700 text-center transition-all group flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 block">الطالب</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">أحمد خالد</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('parent')}
                className="p-3 rounded-xl bg-slate-800 hover:bg-purple-950/50 hover:border-purple-500/50 border border-slate-700 text-center transition-all group flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-200 block">ولي الأمر</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">م. خالد سعد</span>
              </button>
            </div>
          </div>

          {/* Standard Form Login */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-xl bg-red-900/50 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@alsalam.edu"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => { setForgotModal(true); setForgotSuccess(false); }}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">ملاحظة: كافة كلمات المرور النموذجية هي: <code className="text-amber-400 bg-slate-800 px-1 rounded">123456</code></p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري التحقق من الصلاحيات...</span>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          نظام محمي بتقنيات التشفير وصلاحيات وصول متعددة الأدوار (RBAC) - 2026
        </p>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              استرجاع كلمة المرور
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              أدخل بريدك الإلكتروني المسجل في النظام وسنقوم بإرسال رابط إعادة تعيين كلمة المرور آمن.
            </p>

            {forgotSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs mb-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-bold mb-1">تم إرسال تعليمات الاسترجاع!</p>
                  <p>تم إرسال رابط مؤقت إلى بريدك الإلكتروني ({forgotEmail}) مع رمز التحقق الآمن.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@alsalam.edu"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors cursor-pointer"
                >
                  إرسال رابط الاسترجاع
                </button>
              </form>
            )}

            <button
              onClick={() => setForgotModal(false)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
