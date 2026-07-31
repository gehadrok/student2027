import React from 'react';
import { UserRole } from '../types';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, CalendarDays,
  UserCheck, Award, DollarSign, PieChart, Settings, Bell, Sparkles,
  ChevronRight, ChevronLeft, Layers, FileText, Library, FolderArchive, Database
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userRole?: UserRole;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole = 'admin',
  isCollapsed = false,
  onToggleCollapse = () => {},
  isOpen = false,
  onClose
}) => {
  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    roles: UserRole[];
    badge?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'master-data',
      label: 'مركز البيانات الأساسية',
      icon: <Database className="w-5 h-5" />,
      roles: ['admin'],
      badge: 'جديد'
    },
    {
      id: 'students',
      label: userRole === 'parent' ? 'متابعة الأبناء' : userRole === 'teacher' ? 'طلاب فصولي' : 'إدارة الطلاب',
      icon: <Users className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent']
    },
    {
      id: 'classes',
      label: 'الفصول والشعب',
      icon: <Layers className="w-5 h-5" />,
      roles: ['admin']
    },
    {
      id: 'teachers',
      label: 'إدارة المدرسين',
      icon: <GraduationCap className="w-5 h-5" />,
      roles: ['admin']
    },
    {
      id: 'subjects',
      label: 'المواد الدراسية',
      icon: <BookOpen className="w-5 h-5" />,
      roles: ['admin']
    },
    {
      id: 'timetable',
      label: userRole === 'student' ? 'جدولي الدراسي' : 'الحصص والجداول',
      icon: <Calendar className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'calendar',
      label: 'التقويم والأجندة',
      icon: <CalendarDays className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'attendance',
      label: userRole === 'student' ? 'سجل الحضور' : userRole === 'parent' ? 'حضور الأبناء' : 'الحضور والغياب',
      icon: <UserCheck className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'grades',
      label: userRole === 'student' ? 'درجاتي ونتائجي' : userRole === 'parent' ? 'درجات الأبناء' : 'رصد الدرجات',
      icon: <FileText className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'certificates',
      label: userRole === 'student' ? 'شهاداتي التقديرية' : 'إصدار الشهادات',
      icon: <Award className="w-5 h-5" />,
      roles: ['admin', 'student']
    },
    {
      id: 'financial',
      label: userRole === 'parent' ? 'الأقساط والرسوم' : 'الإدارة المالية',
      icon: <DollarSign className="w-5 h-5" />,
      roles: ['admin', 'parent']
    },
    {
      id: 'library',
      label: userRole === 'student' ? 'المكتبة واستعاراتي' : 'المكتبة المدرسية',
      icon: <Library className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'documents',
      label: 'مركز الملفات والوثائق',
      icon: <FolderArchive className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'reports',
      label: 'التقارير والإحصائيات',
      icon: <PieChart className="w-5 h-5" />,
      roles: ['admin']
    },
    {
      id: 'ai-insights',
      label: 'التحليلات الذكية AI',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      roles: ['admin', 'teacher'],
      badge: 'جديد'
    },
    {
      id: 'notifications',
      label: 'مركز الإشعارات',
      icon: <Bell className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'student', 'parent']
    },
    {
      id: 'settings',
      label: 'الإعدادات والنظام',
      icon: <Settings className="w-5 h-5" />,
      roles: ['admin']
    }
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(userRole as UserRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs animate-in fade-in duration-200 print:hidden"
        />
      )}

      <aside className={`bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col justify-between border-l border-slate-800 print:hidden ${
        isCollapsed ? 'w-20' : 'w-64'
      } shrink-0 min-h-[calc(100vh-4rem)] z-50 ${
        isOpen ? 'fixed inset-y-0 right-0 shadow-2xl lg:static' : 'hidden lg:flex'
      }`}>
        <div className="py-4">
          {/* Collapse toggle */}
          <div className="px-4 mb-4 flex items-center justify-between">
            {!isCollapsed && (
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                قائمة التصفح الرئيسية
              </span>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors mx-auto cursor-pointer"
              title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1 px-3">
            {filteredItems.map(item => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-4 m-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-center">
          <p className="text-xs font-semibold text-slate-300">مدرسة خالد ابن الوليد - الضالع/جحاف</p>
          <p className="text-[11px] text-slate-500 mt-0.5">إصدار MVP المطور بـ RealmDB</p>
        </div>
      )}
    </aside>
    </>
  );
};
