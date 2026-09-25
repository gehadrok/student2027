/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth, type UserRole } from './lib/auth';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { SwitchUserModal } from './components/SwitchUserModal';
import { AIChatAssistant } from './components/AIChatAssistant';

// Screens
import { AdminDashboard } from './screens/AdminDashboard';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { StudentDashboard } from './screens/StudentDashboard';
import { ParentDashboard } from './screens/ParentDashboard';
import { StudentsScreen } from './screens/StudentsScreen';
import { ClassesScreen } from './screens/ClassesScreen';
import { TeachersScreen } from './screens/TeachersScreen';
import { SubjectsScreen } from './screens/SubjectsScreen';
import { TimetableScreen } from './screens/TimetableScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { GradesScreen } from './screens/GradesScreen';
import { CertificatesScreen } from './screens/CertificatesScreen';
import { FinancialScreen } from './screens/FinancialScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { DocumentCenterScreen } from './screens/DocumentCenterScreen';
import { AIInsightsScreen } from './screens/AIInsightsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { MasterDataCenter } from './modules/master-data/screens/MasterDataCenter';
import { AcademicCenter } from './modules/academic/presentation/screens/AcademicCenter';
import { ToastProvider } from './components/common/ToastContext';
import { ReferenceDataProvider } from './lib/reference-data';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
  // Violation fixed: removed getRealmDB() and db state.
  // Screens and components now access data through DashboardService / repositories.
  const { status, user: currentUser, mode, login, logout, can, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false);
  const [showAIChat, setShowAIChat] = useState<boolean>(false);

  // Global Keyboard Shortcuts
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, action: () => setShowAIChat((prev) => !prev), description: 'تغيير المستشار الذكي' },
    { key: 'i', ctrl: true, action: () => setActiveTab('ai-insights'), description: 'الانتقال للتحليلات الذكية' },
    { key: 'p', ctrl: true, action: () => window.print(), description: 'طباعة التقرير الفعال' },
    { key: 'escape', action: () => { setShowAIChat(false); setShowSwitchModal(false); }, description: 'إغلاق النوافذ' }
  ]);

  const handleLoginSuccess = async (email: string, password: string) => {
    await login({ email, password });
    setActiveTab('dashboard');
  };

  const handleSwitchRole = async (role: UserRole) => {
    await switchRole(role);
    setActiveTab('dashboard');
    setShowSwitchModal(false);
  };

  if (status === 'initializing') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans text-slate-600" dir="rtl">
        <span className="text-sm font-semibold">جارٍ استعادة الجلسة...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Determine main dashboard based on role when on 'dashboard' tab
  const renderDashboardByRole = () => {
    const aiOpener = () => setShowAIChat(true);
    switch (currentUser.role) {
      case 'admin':
        return <AdminDashboard onNavigate={setActiveTab} onOpenAI={aiOpener} />;
      case 'teacher':
        return <TeacherDashboard onNavigate={setActiveTab} />;
      case 'student':
        return <StudentDashboard onNavigate={setActiveTab} />;
      case 'parent':
        return <ParentDashboard onNavigate={setActiveTab} />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardByRole();
      case 'students':
        return <StudentsScreen />;
      case 'classes':
        return <ClassesScreen />;
      case 'teachers':
        return <TeachersScreen />;
      case 'subjects':
        return <SubjectsScreen />;
      case 'timetable':
        return <TimetableScreen />;
      case 'calendar':
        return <CalendarScreen onNavigate={setActiveTab} />;
      case 'attendance':
        return <AttendanceScreen />;
      case 'grades':
        return <GradesScreen />;
      case 'certificates':
        return <CertificatesScreen />;
      case 'financial':
        return <FinancialScreen />;
      case 'library':
        return <LibraryScreen />;
      case 'documents':
        return <DocumentCenterScreen onNavigate={setActiveTab} />;
      case 'reports':
        return <ReportsScreen />;
      case 'ai-insights':
        return <AIInsightsScreen onNavigate={setActiveTab} />;
      case 'settings':
        return <SettingsScreen onNavigate={setActiveTab} />;
      case 'master-data':
        return <MasterDataCenter />;
      case 'academic':
        return <AcademicCenter />;
      default:
        return renderDashboardByRole();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800" dir="rtl">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        mode={mode}
        unreadNotifsCount={3}
        onLogout={() => {
          void logout();
        }}
        onOpenNotifications={() => setActiveTab('notifications')}
        onOpenAI={() => setShowAIChat(true)}
        onSwitchUserModal={() => setShowSwitchModal(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      <div className="flex flex-1 relative overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false);
          }}
          userRole={currentUser.role}
          canAccess={can}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {renderContent()}
        </main>
      </div>

      <AIChatAssistant
        isOpen={showAIChat}
        onOpen={() => setShowAIChat(true)}
        onClose={() => setShowAIChat(false)}
      />

      <SwitchUserModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        onUserSwitched={() => setShowSwitchModal(false)}
        onSelectRole={handleSwitchRole}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ReferenceDataProvider>
          <AppContent />
        </ReferenceDataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
