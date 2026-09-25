import React from 'react';
import { SchoolSettings, UserRole } from '../types';
import type { AuthUser } from '../lib/auth/contract';
import type { IntegrationMode } from '../lib/runtime/mode';
import { Bell, LogOut, RefreshCw, Shield, GraduationCap, Users, UserCheck, Sparkles, Menu } from 'lucide-react';
import { GlobalSearchBar } from './GlobalSearchBar';

interface NavbarProps {
  currentUser: AuthUser | null;
  mode?: IntegrationMode;
  settings?: SchoolSettings;
  unreadNotifsCount: number;
  onLogout: () => void;
  onOpenNotifications: () => void;
  onOpenAI: () => void;
  onSwitchUserModal: () => void;
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  mode = 'mock',
  settings,
  unreadNotifsCount,
  onLogout,
  onOpenNotifications,
  onOpenAI,
  onSwitchUserModal,
  onToggleSidebar,
  onNavigate
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'مدير النظام (الإدارة)', bg: 'bg-red-100 text-red-800 border-red-200', icon: <Shield className="w-3.5 h-3.5 mr-1" /> };
      case 'teacher':
        return { label: 'معلم مادة', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: <GraduationCap className="w-3.5 h-3.5 mr-1" /> };
      case 'student':
        return { label: 'طالب دراسي', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <UserCheck className="w-3.5 h-3.5 mr-1" /> };
      case 'parent':
        return { label: 'ولي أمر', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Users className="w-3.5 h-3.5 mr-1" /> };
    }
  };

  const badge = currentUser ? getRoleBadge(currentUser.role) : null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Right side: Logo and School Name (RTL layout: right is start) */}
        <div className="flex items-center gap-3 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
              title="القائمة الجانبية"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.schoolName}
              className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
              خ
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-none">
                {settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف"}
              </h1>
              <span className="hidden xl:inline-block px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {settings?.academicYear || "2025/2026"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium hidden 2xl:block">
              {settings?.nameEn || "Khalid Ibn Al-Waleed School"} | نظام الإدارة المدرسية الذكي
            </p>
          </div>
        </div>

        {/* Middle: Global Search Bar */}
        <div className="flex-1 max-w-xl hidden md:block">
          <GlobalSearchBar onNavigate={onNavigate} />
        </div>

        {/* Left side: AI Assistant button, Notifications, User info, Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AI Assistant trigger */}
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-xs hover:shadow-md hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer"
            title="المساعد الذكي وتحليل الأداء"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">المساعد (AI)</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="مركز الإشعارات التفاعلي"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
              </span>
            )}
          </button>

          {/* User Badge & Switcher */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-r border-slate-200">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#2563eb' }}
              >
                {currentUser.name ? currentUser.name.charAt(0) : 'م'}
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser.name || 'مستخدم'}
                </p>
                {badge && (
                  <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${badge.bg}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                )}
              </div>

              {/* Fast switch user modal for testing MVP */}
              {mode === 'mock' && (
                <button
                  onClick={onSwitchUserModal}
                  className="p-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 border border-slate-200 ml-1 cursor-pointer"
                  title="تبديل الحساب لتجربة دور آخر (المدير، المعلم، الطالب، ولي الأمر)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تبديل الدور</span>
                </button>
              )}

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
