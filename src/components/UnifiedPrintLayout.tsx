import React from 'react';
import { 
  GraduationCap, BookOpen, Star, Phone, Mail, MapPin, 
  Calendar, Hash, Clock, User, FileText
} from 'lucide-react';
import { getRealmDB } from '../lib/db';

export interface UnifiedPrintLayoutProps {
  reportTitle: string;
  reportSubtitle?: string;
  reportNumber?: string;
  date?: string;
  printTime?: string;
  userName?: string;
  pageNumber?: string;
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showSignatures?: boolean;
  customNote?: string;
}

export const UnifiedPrintLayout: React.FC<UnifiedPrintLayoutProps> = ({
  reportTitle,
  reportSubtitle,
  reportNumber,
  date,
  printTime,
  userName,
  pageNumber = "صفحة 1 من 1",
  children,
  showHeader = true,
  showFooter = true,
  showSignatures = true,
  customNote
}) => {
  const db = getRealmDB();
  const schoolName = db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف";
  const schoolNameEn = db.settings?.nameEn || "KHALID IBN AL-WALEED SCHOOL - DHALEA/JAHAF";
  const phone = db.settings?.phone || "+967 771 234 567";
  const email = db.settings?.email || "info@khalid-school.edu.ye";
  const address = db.settings?.address || "اليمن - محافظة الضالع - جحاف";
  const defaultAdmin = db.settings?.adminName || "إدارة النظم والمعلومات";

  const now = new Date();
  const dateStr = date || now.toLocaleDateString('ar-SA');
  const timeStr = printTime || now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const serialNo = reportNumber || `REP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const currentUser = userName || defaultAdmin;

  return (
    <div className="w-full bg-white text-slate-900 font-sans relative select-text" dir="rtl">
      {/* 1. HEADER (شعار المدرسة - اسم المدرسة - اسم التقرير - التاريخ - رقم التقرير - QR Code) */}
      {showHeader && (
        <header className="w-full border-b-2 border-slate-900 pb-4 mb-6">
          <div className="grid grid-cols-12 items-center gap-4">
            
            {/* Right: School Logo & School Name */}
            <div className="col-span-4 flex items-center gap-3">
              <div className="relative shrink-0 flex flex-col items-center">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 absolute -top-1.5 z-10" />
                <div className="w-14 h-16 rounded-b-full rounded-t-md bg-[#0a192f] p-1 flex flex-col items-center justify-center text-amber-400 border-2 border-amber-400 shadow-sm">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <h1 className="font-black text-slate-900 text-base md:text-lg leading-snug">{schoolName}</h1>
                <p className="text-[10px] font-black text-amber-600 font-mono tracking-wider">{schoolNameEn}</p>
                <p className="text-[10px] text-slate-500 font-bold">النظام الإداري والتعليمي الموحد</p>
              </div>
            </div>

            {/* Center: Report Title */}
            <div className="col-span-5 text-center px-2">
              <div className="inline-block bg-slate-900 text-white px-6 py-1.5 rounded-xl shadow-xs">
                <h2 className="text-lg md:text-xl font-black tracking-tight">{reportTitle}</h2>
              </div>
              {reportSubtitle && (
                <p className="text-xs font-bold text-slate-600 mt-1.5">{reportSubtitle}</p>
              )}
            </div>

            {/* Left: Date, Report Number & QR Code */}
            <div className="col-span-3 flex items-center justify-end gap-3 text-left">
              <div className="text-xs font-bold text-slate-700 space-y-1 text-right">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-500 text-[11px]">التاريخ:</span>
                  <span className="font-mono font-bold text-slate-900">{dateStr}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-500 text-[11px]">رقم التقرير:</span>
                  <span className="font-mono font-black text-blue-900">{serialNo}</span>
                </div>
              </div>

              {/* QR Code SVG for Verification */}
              <div className="w-14 h-14 bg-slate-50 p-1 border border-slate-300 rounded-lg shrink-0 flex flex-col items-center justify-center" title="رمز التحقق الرقمي المعتمد">
                <svg viewBox="0 0 29 29" className="w-full h-full text-slate-900 fill-current">
                  <path d="M0,0 h9 v9 h-9 z M2,2 h5 v5 h-5 z M3,3 h3 v3 h-3 z" />
                  <path d="M20,0 h9 v9 h-9 z M22,2 h5 v5 h-5 z M23,3 h3 v3 h-3 z" />
                  <path d="M0,20 h9 v9 h-9 z M2,22 h5 v5 h-5 z M3,23 h3 v3 h-3 z" />
                  <path d="M11,1 h3 v3 h-3 z M16,1 h2 v2 h-2 z M11,5 h2 v3 h-2 z M15,4 h3 v3 h-3 z" />
                  <path d="M10,10 h2 v2 h-2 z M13,11 h3 v2 h-3 z M17,10 h3 v3 h-3 z M22,10 h2 v2 h-2 z" />
                  <path d="M10,14 h4 v2 h-4 z M15,14 h2 v4 h-2 z M18,14 h5 v2 h-5 z" />
                  <path d="M10,17 h2 v3 h-2 z M13,18 h4 v2 h-4 z M21,17 h4 v2 h-4 z" />
                  <path d="M10,21 h3 v3 h-3 z M14,21 h2 v4 h-2 z M17,21 h3 v2 h-3 z M23,21 h4 v3 h-4 z" />
                  <path d="M11,26 h4 v2 h-4 z M17,25 h5 v3 h-5 z M24,25 h3 v3 h-3 z" />
                </svg>
              </div>
            </div>

          </div>

          {/* Golden Sub-header Ribbon */}
          <div className="w-full bg-[#0a192f] h-2 mt-3 rounded-full relative overflow-hidden flex items-center">
            <div className="w-1/3 h-full bg-amber-400"></div>
          </div>
        </header>
      )}

      {/* 2. BODY (محتوى التقرير) */}
      <main className="w-full my-4 min-h-[400px]">
        {children}
      </main>

      {/* Custom Note if provided */}
      {customNote && customNote.trim().length > 0 && (
        <div className="my-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <strong className="block font-black mb-0.5">ملاحظة التقرير:</strong>
          <p>{customNote}</p>
        </div>
      )}

      {/* Signatures & Stamps section if enabled */}
      {showSignatures && (
        <section className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-700 break-inside-avoid">
          <div>
            <p className="text-slate-500 mb-2">إعداد الموظف / القسم المختص</p>
            <p className="font-black text-slate-900">{currentUser}</p>
            <div className="h-8 border-b border-dashed border-slate-400 w-3/4 mx-auto mt-2"></div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-600 flex items-center justify-center text-[10px] text-blue-900 font-black bg-blue-50/50 p-1">
              ختم الاعتماد<br />المدرسي
            </div>
          </div>
          <div>
            <p className="text-slate-500 mb-2">اعتماد مدير المدرسة</p>
            <p className="font-black text-slate-900">أ. أحمد محمد صالح</p>
            <div className="h-8 border-b border-dashed border-slate-400 w-3/4 mx-auto mt-2"></div>
          </div>
        </section>
      )}

      {/* 3. FOOTER (الهاتف - البريد الإلكتروني - العنوان - رقم الصفحة - وقت الطباعة - اسم المستخدم) */}
      {showFooter && (
        <footer className="w-full mt-8 pt-3 border-t-2 border-slate-900 text-xs text-slate-700 break-inside-avoid">
          {/* Main Footer Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-[11px] font-bold pb-2 items-center text-center md:text-right">
            {/* Phone */}
            <div className="flex items-center justify-center md:justify-start gap-1">
              <Phone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="text-slate-500">الهاتف:</span>
              <span className="font-mono text-slate-900" dir="ltr">{phone}</span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-center md:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="text-slate-500">البريد:</span>
              <span className="font-mono text-slate-900 truncate">{email}</span>
            </div>

            {/* Address */}
            <div className="flex items-center justify-center md:justify-start gap-1 col-span-2">
              <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="text-slate-500">العنوان:</span>
              <span className="text-slate-900 truncate">{address}</span>
            </div>

            {/* Print Time */}
            <div className="flex items-center justify-center md:justify-start gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="text-slate-500">وقت الطباعة:</span>
              <span className="font-mono font-bold text-slate-900">{timeStr}</span>
            </div>

            {/* User Name */}
            <div className="flex items-center justify-center md:justify-start gap-1">
              <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="text-slate-500">المستخدم:</span>
              <span className="font-bold text-slate-900 truncate">{currentUser}</span>
            </div>
          </div>

          {/* Bottom Copyright & Page Number Bar */}
          <div className="bg-slate-900 text-white rounded-lg px-4 py-1.5 flex items-center justify-between text-[10px] font-bold font-mono">
            <span>نظام إداري تعليمي مدمج 3NF — جميع الحقوق محفوظة {now.getFullYear()}</span>
            <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded font-black">{pageNumber}</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default UnifiedPrintLayout;
