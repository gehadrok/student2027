import React, { useState } from 'react';
import {
  getRealmDB, saveRealmDB, addAuditLog, subscribeRealmDB, getCurrentUser
} from '../lib/db';
import { SQLiteRepository } from '../lib/sqlite-repository';
import { SchoolSettings, AuditLog } from '../types';
import { SettingsCard } from '../components/settings/SettingsCard';
import { SettingsSection } from '../components/settings/SettingsSection';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { useToast } from '../components/common/ToastContext';
import {
  Settings, Building, GraduationCap, DollarSign, Shield, Bell,
  Printer, Database, Sparkles, Palette, Info, FileText, Search,
  Save, RotateCcw, Download, Upload, CheckCircle2, ShieldCheck,
  Globe, Phone, Mail, MapPin, Award, Calendar, Lock, UserCheck,
  Key, Clock, Server, HardDrive, FileSpreadsheet, Eye, QrCode,
  Image as ImageIcon, RefreshCw, Layers, ShieldAlert, Cpu
} from 'lucide-react';

interface SettingsScreenProps {
  onNavigate?: (tab: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const currentUser = getCurrentUser();

  // Load live DB settings
  const [db, setDb] = useState(getRealmDB());
  const [settings, setSettings] = useState<SchoolSettings>(() => SQLiteRepository.getSchoolSettings());

  // Navigation & Search state
  const [activeTab, setActiveTab] = useState<string>('branding');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Subscribe to DB updates
  React.useEffect(() => {
    const unsubscribe = subscribeRealmDB(() => {
      setDb(getRealmDB());
      setSettings(SQLiteRepository.getSchoolSettings());
    });
    return unsubscribe;
  }, []);

  const handleChange = (field: keyof SchoolSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      SQLiteRepository.updateSchoolSettings(settings);
      addAuditLog('تحديث إعدادات النظام', `تم تحديث الهوية والإعدادات العامة للمدرسة بواسطة ${currentUser?.name || 'المدير العام'}`);
      showToast('تم حفظ كافة إعدادات النظام وتحديث الهوية المركزية بنجاح', 'success');
      setIsSaving(false);
    }, 300);
  };

  const handleReset = () => {
    const defaultSettings: SchoolSettings = {
      schoolName: 'مدرسة خالد ابن الوليد الضالع/جحاف',
      nameEn: 'Khaled Ibn Al-Waleed Secondary School',
      phone: '+967-770001122',
      mobile: '+967-733334455',
      email: 'info@khaled-school.edu.ye',
      address: 'مديرية جحاف - محافظة الضالع - اليمن',
      website: 'https://khaled-school.edu.ye',
      adminName: 'أ. عبد الفتاح الجحافي',
      academicYear: '2025-2026',
      currentTerm: 'الفصل الدراسي الأول',
      logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=200',
      primaryColor: '#1e3a8a',
      enableSMSAlerts: true,
      enableAIAnalysis: true,
      attendanceLockHour: '09:00',
      ministryLicense: 'وزارة التربية والتعليم #48291',
      taxNumber: 'TAX-9028341',
      schoolCode: 'KHS-YEM-2026',
      city: 'مديرية جحاف',
      country: 'الجمهورية اليمنية',
      language: 'ar',
      timeZone: 'Asia/Aden',
      dateFormat: 'DD/MM/YYYY',
      currency: 'YER',
      stampUrl: 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&q=80&w=150',
      principalSignatureUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
      reportHeader: 'الجمهورية اليمنية - وزارة التربية والتعليم - مدرسة خالد ابن الوليد الثانوية',
      reportFooter: 'هذه الوثيقة صادرة إلكترونياً وتعتبر رسمية عند اقترانها بالختم والرمز الرقمي QR',
      passingGradeThreshold: 50,
      gradingSystem: 'percentage',
      invoicePrefix: 'INV-2026-',
      receiptPrefix: 'REC-2026-',
      paperSize: 'A4',
      watermarkText: 'مدرسة خالد بن الوليد - رسمي',
      enableQRCode: true,
      autoBackupFrequency: 'daily',
      sessionTimeoutMinutes: 30,
      enable2FA: false,
      enableEmailNotifs: true,
      enablePushNotifs: true,
      compactMode: false,
      sidebarStyle: 'default',
      fontSize: 'md'
    };

    setSettings(defaultSettings);
    SQLiteRepository.updateSchoolSettings(defaultSettings);
    addAuditLog('إعادة ضبط الإعدادات', 'تمت استعادة الإعدادات الافتراضية للنظام');
    setShowResetModal(false);
    showToast('تمت استعادة الإعدادات الافتراضية بنجاح', 'info');
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify({ settings, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school_settings_backup_${Date.now()}.json`;
    a.click();
    showToast('تم تصدير ملف الإعدادات والنسخة الاحتياطية بنجاح', 'success');
  };

  const categories = [
    { id: 'branding', title: 'هوية المدرسة والرموز الرسمية', icon: <Building className="w-5 h-5 text-indigo-600" />, badge: 'مركزي' },
    { id: 'general', title: 'الإعدادات العامة والزمانية', icon: <Globe className="w-5 h-5 text-teal-600" /> },
    { id: 'academic', title: 'الإعدادات الأكاديمية والتنظيم', icon: <GraduationCap className="w-5 h-5 text-blue-600" /> },
    { id: 'financial', title: 'الإعدادات المالية والرسوم', icon: <DollarSign className="w-5 h-5 text-emerald-600" /> },
    { id: 'users_security', title: 'المستخدمون والصلاحيات والأمان', icon: <Shield className="w-5 h-5 text-rose-600" /> },
    { id: 'notifications', title: 'الإشعارات وقنوات التواصل', icon: <Bell className="w-5 h-5 text-amber-600" /> },
    { id: 'reports_printing', title: 'التقارير والطباعة والوثائق', icon: <Printer className="w-5 h-5 text-purple-600" /> },
    { id: 'backup_restore', title: 'النسخ الاحتياطي والصيانة', icon: <Database className="w-5 h-5 text-cyan-600" /> },
    { id: 'ai', title: 'الذكاء الاصطناعي والتحليلات', icon: <Sparkles className="w-5 h-5 text-amber-500" />, badge: 'AI' },
    { id: 'appearance', title: 'المظهر والواجهة والسمات', icon: <Palette className="w-5 h-5 text-fuchsia-600" /> },
    { id: 'system_info', title: 'معلومات النظام والترخيص', icon: <Info className="w-5 h-5 text-slate-600" /> },
    { id: 'audit_logs', title: 'سجل العمليات والرقابة', icon: <FileText className="w-5 h-5 text-slate-700" /> }
  ];

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return cat.title.toLowerCase().includes(q) || cat.id.includes(q);
  });

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-200" dir="rtl">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 shadow-inner">
              <Settings className="w-8 h-8 text-teal-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">مركز إعدادات المؤسسة التعليمية</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 font-bold text-[10px]">
                  Enterprise Hub v3.5
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                إدارة شاملة لكافة مكونات النظام، الهوية المؤسسية المركزية، التراخيص، الصلاحيات، والطباعة الرسمية.
              </p>
            </div>
          </div>

          {/* Search Settings Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في الإعدادات والخيارات..."
              className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR TABS & CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* TABS SIDEBAR */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 p-3 shadow-xs space-y-1 sticky top-6">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            أقسام الإعدادات ({filteredCategories.length})
          </div>

          <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all text-right cursor-pointer ${
                  activeTab === cat.id
                    ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/15'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-xl ${activeTab === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs">{cat.title}</span>
                </div>
                {cat.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      activeTab === cat.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {cat.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* TABS CONTENT AREA */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECTION 1: BRANDING IDENTITY (هوية المدرسة المركزية) */}
          {(activeTab === 'branding' || searchQuery) && (
            <SettingsCard
              id="branding"
              title="الهوية المؤسسية المركزية والرموز الرسمية"
              description="تحديث البيانات هنا يغير الشعار واسم المدرسة تلقائياً في شاشة الدخول، لوحة التحكم، جميع التقارير، الشهادات، الفواتير، الإيصالات، وبطاقات الطلاب والمعلمين."
              icon={<Building className="w-5 h-5 text-indigo-600" />}
              badge="تأثير شامل"
            >
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-900 leading-relaxed">
                  <strong>الربط المركزي المباشر:</strong> يتم اعتماد الهوية الرسمية (اسم المدرسة، الشعار، الختم، توقيع المدير، ورأس التقارير) في جميع الشاشات والوثائق المطبوعة دون الحاجة لإعادة إدخالها.
                </p>
              </div>

              <SettingsSection title="أسماء المدرسة والتراخيص الرسمية" cols={2}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المدرسة الرسمي (بالعربية)</label>
                  <input
                    type="text"
                    value={settings.schoolName || ''}
                    onChange={(e) => handleChange('schoolName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المدرسة بالإنجليزية (English Name)</label>
                  <input
                    type="text"
                    value={settings.nameEn || ''}
                    onChange={(e) => handleChange('nameEn', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المدير العام / المبدع</label>
                  <input
                    type="text"
                    value={settings.adminName || ''}
                    onChange={(e) => handleChange('adminName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الترخيص الوزاري</label>
                  <input
                    type="text"
                    value={settings.ministryLicense || ''}
                    onChange={(e) => handleChange('ministryLicense', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </SettingsSection>

              <SettingsSection title="الرموز الرسمية والأختام والوسائط" cols={3}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رابط شعار المدرسة (Logo URL)</label>
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  {settings.logoUrl && (
                    <div className="mt-2 p-2 bg-slate-50 border rounded-xl flex items-center gap-3">
                      <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white p-1 border" />
                      <span className="text-[11px] text-slate-500">معاينة الشعار الرسمي</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رابط الختم الرسمـي (Stamp URL)</label>
                  <input
                    type="text"
                    value={settings.stampUrl || ''}
                    onChange={(e) => handleChange('stampUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  {settings.stampUrl && (
                    <div className="mt-2 p-2 bg-slate-50 border rounded-xl flex items-center gap-3">
                      <img src={settings.stampUrl} alt="Stamp" className="w-10 h-10 object-contain rounded-lg bg-white p-1 border" />
                      <span className="text-[11px] text-slate-500">معاينة الختم المعتمد</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">توقيع المدير الرقمي (Signature)</label>
                  <input
                    type="text"
                    value={settings.principalSignatureUrl || ''}
                    onChange={(e) => handleChange('principalSignatureUrl', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  {settings.principalSignatureUrl && (
                    <div className="mt-2 p-2 bg-slate-50 border rounded-xl flex items-center gap-3">
                      <img src={settings.principalSignatureUrl} alt="Signature" className="w-10 h-10 object-contain rounded-lg bg-white p-1 border" />
                      <span className="text-[11px] text-slate-500">معاينة التوقيع الرقمي</span>
                    </div>
                  )}
                </div>
              </SettingsSection>

              {/* LIVE OFFICIAL IDENTITY PREVIEW CARD */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                  <div className="flex items-center gap-3">
                    <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-xs" />
                    <div>
                      <h4 className="text-sm font-black text-amber-400">{settings.schoolName}</h4>
                      <p className="text-[10px] text-slate-300 font-mono" dir="ltr">{settings.nameEn}</p>
                    </div>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-400">
                    <div>{settings.ministryLicense}</div>
                    <div>كود المؤسسة: {settings.schoolCode}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-300">
                    <div>المدير العام: <strong className="text-white">{settings.adminName}</strong></div>
                    <div>العنوان: <span className="text-slate-400">{settings.address}</span></div>
                  </div>

                  <div className="flex items-center gap-3">
                    {settings.stampUrl && (
                      <img src={settings.stampUrl} alt="Stamp" className="w-12 h-12 object-contain opacity-90 border border-white/20 rounded-full p-1 bg-white/10" />
                    )}
                    {settings.principalSignatureUrl && (
                      <img src={settings.principalSignatureUrl} alt="Sig" className="w-12 h-12 object-contain opacity-90 border border-white/20 rounded-lg p-1 bg-white/10" />
                    )}
                  </div>
                </div>
              </div>
            </SettingsCard>
          )}

          {/* SECTION 2: GENERAL SETTINGS */}
          {(activeTab === 'general' || searchQuery) && (
            <SettingsCard
              id="general"
              title="الإعدادات العامة والبيانات المكانية والزمانية"
              description="إدارة التقويم الدراسي، لغة الواجهة، المنطقة الزمنية، والصيغ الرسمية للتواريخ والعملات."
              icon={<Globe className="w-5 h-5 text-teal-600" />}
            >
              <SettingsSection title="التوقيت واللغة والعملة" cols={3}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اللغة الافتراضية للنظام</label>
                  <select
                    value={settings.language || 'ar'}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ar">العربية (اللغة الرسمية - RTL)</option>
                    <option value="en">English (LTR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة الزمنية (Time Zone)</label>
                  <select
                    value={settings.timeZone || 'Asia/Aden'}
                    onChange={(e) => handleChange('timeZone', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Asia/Aden">Asia/Aden (GMT+3 اليمن)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (GMT+3 السعودية)</option>
                    <option value="Cairo">Africa/Cairo (GMT+2 مصر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العملة الافتراضية</label>
                  <select
                    value={settings.currency || 'YER'}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="YER">YER - ريال يمني</option>
                    <option value="SAR">SAR - ريال سعودي</option>
                    <option value="USD">USD - دولار أمريكي</option>
                  </select>
                </div>
              </SettingsSection>

              <SettingsSection title="معلومات التواصل والموقع الجغرافي" cols={2}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدولة</label>
                  <input
                    type="text"
                    value={settings.country || 'الجمهورية اليمنية'}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / المديرية</label>
                  <input
                    type="text"
                    value={settings.city || 'مديرية جحاف - الضالع'}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الأرضي</label>
                  <input
                    type="text"
                    value={settings.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال الرسمي</label>
                  <input
                    type="text"
                    value={settings.mobile || ''}
                    onChange={(e) => handleChange('mobile', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموقع الإلكتروني الرسمي</label>
                  <input
                    type="text"
                    value={settings.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 3: ACADEMIC SETTINGS */}
          {(activeTab === 'academic' || searchQuery) && (
            <SettingsCard
              id="academic"
              title="الإعدادات الأكاديمية ونظام التقييم والغياب"
              description="تحديد السنة الدراسية الفعلية، الترم، حد النجاح، وساعة إغلاق تسجيل الحضور اليومي."
              icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
            >
              <SettingsSection title="العام الدراسي والترم الحالي" cols={2}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العام الدراسي الفعال</label>
                  <input
                    type="text"
                    value={settings.academicYear || '2025-2026'}
                    onChange={(e) => handleChange('academicYear', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الفصل الدراسي الحالي (الترم)</label>
                  <select
                    value={settings.currentTerm || 'الفصل الدراسي الأول'}
                    onChange={(e) => handleChange('currentTerm', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                    <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                    <option value="الفصل الصيفي">الفصل الصيفي التكميلي</option>
                  </select>
                </div>
              </SettingsSection>

              <SettingsSection title="معايير الدرجات والانتظام" cols={3}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ساعة إغلاق الحضور اليومي</label>
                  <input
                    type="time"
                    value={settings.attendanceLockHour || '09:00'}
                    onChange={(e) => handleChange('attendanceLockHour', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">درجة النجاح الأدنى (%)</label>
                  <input
                    type="number"
                    min="40"
                    max="70"
                    value={settings.passingGradeThreshold || 50}
                    onChange={(e) => handleChange('passingGradeThreshold', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نظام التقييم الأكاديمي</label>
                  <select
                    value={settings.gradingSystem || 'percentage'}
                    onChange={(e) => handleChange('gradingSystem', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="percentage">نظام مئوي (100 درجة)</option>
                    <option value="letter">نظام التقديرات (A / B / C / D / F)</option>
                    <option value="gpa">نظام النقاط التراكمي (GPA 4.0)</option>
                  </select>
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 4: FINANCIAL SETTINGS */}
          {(activeTab === 'financial' || searchQuery) && (
            <SettingsCard
              id="financial"
              title="الإعدادات المالية وبادئات الفواتير والإيصالات"
              description="ضبط بادئة الفواتير، الإيصالات، العملات، وفئات الرسوم الدراسية."
              icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            >
              <SettingsSection title="بادئات المستندات المالية" cols={2}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بادئة رقم الفاتورة (Invoice Prefix)</label>
                  <input
                    type="text"
                    value={settings.invoicePrefix || 'INV-2026-'}
                    onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بادئة رقم سند القبض (Receipt Prefix)</label>
                  <input
                    type="text"
                    value={settings.receiptPrefix || 'REC-2026-'}
                    onChange={(e) => handleChange('receiptPrefix', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 5: USERS & SECURITY */}
          {(activeTab === 'users_security' || searchQuery) && (
            <SettingsCard
              id="users_security"
              title="المستخدمون والأمان وصلاحيات الوصول"
              description="سياسات كلمة المرور، مدة انتهاء الجلسة، والتحقق ثنائي الخطوات."
              icon={<Shield className="w-5 h-5 text-rose-600" />}
            >
              <SettingsSection title="سياسات الأمان والجلسات" cols={2}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدة انتهاء الجلسة تلقائياً (بالدقائق)</label>
                  <input
                    type="number"
                    value={settings.sessionTimeoutMinutes || 30}
                    onChange={(e) => handleChange('sessionTimeoutMinutes', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-2xl">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">تفعيل التحقق بخطوتين (2FA)</h5>
                    <p className="text-[11px] text-slate-500">إلزام المدراء بالتحقق عبر الرمز عند تسجيل الدخول</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable2FA || false}
                    onChange={(e) => handleChange('enable2FA', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md cursor-pointer"
                  />
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 6: NOTIFICATIONS */}
          {(activeTab === 'notifications' || searchQuery) && (
            <SettingsCard
              id="notifications"
              title="الإشعارات وقنوات التواصل التلقائية"
              description="إعداد بوابات الرسائل القصيرة SMS، التنبيهات البريدية، وإشعارات الغياب الفورية."
              icon={<Bell className="w-5 h-5 text-amber-600" />}
            >
              <SettingsSection title="قنوات الإرسال المفعّلة" cols={3}>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-2xl">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">رسائل SMS القصيرة</h5>
                    <p className="text-[10px] text-slate-500">تنبيهات الغياب والأقساط</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableSMSAlerts}
                    onChange={(e) => handleChange('enableSMSAlerts', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-2xl">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">إشعارات البريد</h5>
                    <p className="text-[10px] text-slate-500">إرسال الشهادات والتقارير</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableEmailNotifs ?? true}
                    onChange={(e) => handleChange('enableEmailNotifs', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-2xl">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">التنبيهات الفورية (Push)</h5>
                    <p className="text-[10px] text-slate-500">تنبيهات المتصفح والجوال</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enablePushNotifs ?? true}
                    onChange={(e) => handleChange('enablePushNotifs', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md cursor-pointer"
                  />
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 7: REPORTS & PRINTING */}
          {(activeTab === 'reports_printing' || searchQuery) && (
            <SettingsCard
              id="reports_printing"
              title="إعدادات الطباعة والتقارير والوثائق الرسمية"
              description="تخصيص الهيدر، التذييل، حجم الورق، العلامة المائية، والرمز الرقمي QR."
              icon={<Printer className="w-5 h-5 text-purple-600" />}
            >
              <SettingsSection title="تخصيص الهيدر والفايتر" cols={1}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص رأس التقارير الرسمية (Report Header Text)</label>
                  <input
                    type="text"
                    value={settings.reportHeader || ''}
                    onChange={(e) => handleChange('reportHeader', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص تذييل التقارير الرسمية (Report Footer Text)</label>
                  <input
                    type="text"
                    value={settings.reportFooter || ''}
                    onChange={(e) => handleChange('reportFooter', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </SettingsSection>

              <SettingsSection title="خيارات الطباعة والأمان الرقمي" cols={3}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حجم الورق الافتراضي</label>
                  <select
                    value={settings.paperSize || 'A4'}
                    onChange={(e) => handleChange('paperSize', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="A4">A4 Standard (210 x 297mm)</option>
                    <option value="A5">A5 Compact (148 x 210mm)</option>
                    <option value="Letter">Letter Size</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">العلامة المائية المطبوعة</label>
                  <input
                    type="text"
                    value={settings.watermarkText || ''}
                    onChange={(e) => handleChange('watermarkText', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-2xl">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">رمز التحقق الرقمي QR</h5>
                    <p className="text-[10px] text-slate-500">طباعة كود للتحقق الأصلي</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableQRCode ?? true}
                    onChange={(e) => handleChange('enableQRCode', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded-md cursor-pointer"
                  />
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 8: BACKUP & RESTORE */}
          {(activeTab === 'backup_restore' || searchQuery) && (
            <SettingsCard
              id="backup_restore"
              title="النسخ الاحتياطي واستعادة البيانات"
              description="توليد نسخة احترازية فورية لكافة قاعدة البيانات والأنشطة لحمايتها من الضياع."
              icon={<Database className="w-5 h-5 text-cyan-600" />}
            >
              <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-cyan-900">إنشاء نسخة احتياطية سريعة الآن</h4>
                  <p className="text-[11px] text-cyan-700 mt-0.5">تحميل قاعدة البيانات والمستندات والتهيئة كملف مجفر موثوق.</p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير النسخة الاحتياطية</span>
                </button>
              </div>

              <SettingsSection title="الجدولة والتخزين الآلي" cols={2}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تكرار النسخ الاحتياطي التلقائي</label>
                  <select
                    value={settings.autoBackupFrequency || 'daily'}
                    onChange={(e) => handleChange('autoBackupFrequency', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="daily">يومي تلقائي عند إغلاق النظام</option>
                    <option value="weekly">أسبوعي (كل يوم جمعة)</option>
                    <option value="monthly">شهري منتظم</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-2xl">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">حالة قاعدة البيانات الحالية</h5>
                    <p className="text-[11px] text-emerald-600 font-bold">SQLite WebAssembly - نشطة ومتزامنة</p>
                  </div>
                  <HardDrive className="w-6 h-6 text-emerald-600" />
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 9: AI SETTINGS */}
          {(activeTab === 'ai' || searchQuery) && (
            <SettingsCard
              id="ai"
              title="محرك الذكاء الاصطناعي والتحليلات التنبؤية"
              description="تفعيل المستشار الذكي، التنبؤ بنسب التعثر المالي والأكاديمي، واقتراح التوصيات."
              icon={<Sparkles className="w-5 h-5 text-amber-500" />}
              badge="المستشار الذكي"
            >
              <div className="flex items-center justify-between p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">تفعيل محرك التحليلات التنبؤية والمستشار الذكي</h4>
                    <p className="text-[11px] text-slate-600">تحليل تلقائي لمستويات الطلاب المتراجعين وتقديم خطط علاجية لمجلس الإدارة.</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={settings.enableAIAnalysis}
                  onChange={(e) => handleChange('enableAIAnalysis', e.target.checked)}
                  className="w-6 h-6 text-amber-500 rounded-md cursor-pointer"
                />
              </div>
            </SettingsCard>
          )}

          {/* SECTION 10: APPEARANCE */}
          {(activeTab === 'appearance' || searchQuery) && (
            <SettingsCard
              id="appearance"
              title="المظهر والواجهة والسمات البصرية"
              description="تحديد اللون الرئيسي للنظام، سمة الشريط الجانبي، وحجم الخطوط."
              icon={<Palette className="w-5 h-5 text-fuchsia-600" />}
            >
              <SettingsSection title="ألوان السمة الرئيسية" cols={3}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اللون الرئيسي للنظام</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor || '#1e3a8a'}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border p-1"
                    />
                    <span className="text-xs font-mono text-slate-600">{settings.primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نمط الشريط الجانبي</label>
                  <select
                    value={settings.sidebarStyle || 'default'}
                    onChange={(e) => handleChange('sidebarStyle', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="default">النمط الكلاسيكي الفاخر</option>
                    <option value="compact">شريط جانبي مدمج</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حجم الخط الأساسي</label>
                  <select
                    value={settings.fontSize || 'md'}
                    onChange={(e) => handleChange('fontSize', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="sm">قياسي مدمج (Small)</option>
                    <option value="md">متوسط قياسي (Medium)</option>
                    <option value="lg">كبير وواضح (Large)</option>
                  </select>
                </div>
              </SettingsSection>
            </SettingsCard>
          )}

          {/* SECTION 11: SYSTEM INFO */}
          {(activeTab === 'system_info' || searchQuery) && (
            <SettingsCard
              id="system_info"
              title="معلومات النظام والترخيص وحالة الخوادم"
              description="تفاصيل الإصدار الحالي، المحرك، حالة الترخيص للمؤسسة، والاستهلاك."
              icon={<Info className="w-5 h-5 text-slate-600" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">إصدار التطبيق</span>
                  <div className="text-sm font-black text-slate-800">v3.5.0 Enterprise Pro</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">محرك قواعد البيانات</span>
                  <div className="text-sm font-black text-slate-800">SQLite 3.45 Sync Engine</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">حالة الترخيص المؤسسي</span>
                  <div className="text-sm font-black text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>نشط - مدرسة خالد بن الوليد</span>
                  </div>
                </div>
              </div>
            </SettingsCard>
          )}

          {/* SECTION 12: AUDIT LOGS */}
          {(activeTab === 'audit_logs' || searchQuery) && (
            <SettingsCard
              id="audit_logs"
              title="سجل العمليات والرقابة والأمان المستمر"
              description="مراقبة كافة التحركات والعمليات التي أجريت على قاعدة بيانات النظام."
              icon={<FileText className="w-5 h-5 text-slate-700" />}
            >
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b font-bold">
                    <tr>
                      <th className="p-3">المستخدم</th>
                      <th className="p-3">نوع الإجراء</th>
                      <th className="p-3">التفاصيل</th>
                      <th className="p-3">التوقيت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {db.auditLogs.slice(0, 8).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-800">{log.userName}</td>
                        <td className="p-3 text-teal-700 font-bold">{log.action}</td>
                        <td className="p-3 text-slate-600">{log.details}</td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SettingsCard>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM SAVE & RESET CONTROL BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 shadow-2xl transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-white text-xs">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
            <span className="hidden sm:inline text-slate-300">مركز التحكم بالإعدادات:</span>
            <span className="font-bold text-teal-300">الهوية المؤسسية متزامنة تلقائياً مع كافة شاشات النظام</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>إعادة الضبط للافتراضي</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات وتطبيق الهوية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showResetModal}
        title="تأكيد إعادة ضبط الإعدادات والهوية"
        message="هل أنت متأكد من رغبتك في استعادة الإعدادات والهوية المؤسسية الافتراضية؟ سيتم إرجاع اسم المدرسة، الشعار، الألوان، وبادئات الفواتير للقيم المعتمدة الأولى."
        confirmLabel="نعم، أعد الضبط الآن"
        cancelLabel="إلغاء الأمر"
        variant="warning"
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
};
