import React, { useState } from 'react';
import { 
  Printer, X, Copy, Check, FileText, Layers, 
  Settings, Award, Clock, Calendar, ShieldCheck, 
  Maximize2, Minimize2, CheckCircle2, Phone, Mail, 
  MapPin, Globe, User, Hash, Sparkles, Star, 
  GraduationCap, BookOpen, Shield, Download
} from 'lucide-react';
import { getRealmDB, addSavedReportLog } from '../lib/db';
import UnifiedPrintLayout from './UnifiedPrintLayout';

export interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportSubtitle?: string;
  children: React.ReactNode;
  defaultOrientation?: 'portrait' | 'landscape';
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportSubtitle = "تقرير إحصائي وتشغيلي معتمد من نظام إدارة المدرسة",
  children,
  defaultOrientation = 'portrait'
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(defaultOrientation);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'compact'>('normal');
  const [showHeader, setShowHeader] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const db = getRealmDB();
  const schoolName = db.settings?.schoolName || "مدرسة خالد ابن الوليد الضالع/جحاف";
  const schoolNameEn = db.settings?.nameEn || "KHALID IBN AL-WALEED SCHOOL - DHALEA/JAHAF";
  const academicYear = db.settings?.academicYear || "2026 - 2027";
  const currentTerm = db.settings?.currentTerm || "الفصل الدراسي الأول";
  const phone = db.settings?.phone || "+967 771 234 567";
  const email = db.settings?.email || "info@khalid-school.edu.ye";
  const address = db.settings?.address || "اليمن - محافظة الضالع - جحاف";
  const website = db.settings?.website || "www.almustaqbal.edu.ye";
  const adminName = db.settings?.adminName || "إدارة النظم والمعلومات";
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA');
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const serialNo = `REP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    try {
      addSavedReportLog({
        title: reportTitle,
        reportType: 'custom_preview',
        reportTypeLabel: reportSubtitle || reportTitle,
        fileFormat: 'Printed',
        notes: customNote || 'تمت طباعة التقرير مباشرة عبر شاشة المعاينة'
      });
    } catch (err) {
      console.error(err);
    }

    const printArea = document.getElementById('printable-report-area');
    if (!printArea) {
      window.print();
      return;
    }

    try {
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.style.zIndex = '-1000';
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (!doc) {
        window.print();
        document.body.removeChild(printIframe);
        return;
      }

      const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(node => node.outerHTML)
        .join('\n');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>${reportTitle}</title>
          ${styleSheets}
          <style>
            @page {
              size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
              margin: 1cm;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              font-family: system-ui, -apple-system, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-report-area {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              position: relative !important;
              background: #ffffff !important;
              visibility: visible !important;
              display: block !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 p-0 m-0" dir="rtl">
          <div id="printable-report-area" class="w-full bg-white text-slate-900">
            ${printArea.innerHTML}
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (e) {
          console.error("Iframe print error:", e);
          window.print();
        }
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        }, 3000);
      }, 500);
    } catch (err) {
      console.error("Print fallback:", err);
      window.print();
    }
  };

  const handleOpenPrintWindow = () => {
    try {
      addSavedReportLog({
        title: reportTitle,
        reportType: 'custom_preview',
        reportTypeLabel: reportSubtitle || reportTitle,
        fileFormat: 'PDF',
        notes: customNote || 'تم فتح التقرير في نافذة طباعة وتأكيده كـ PDF'
      });
    } catch (err) {
      console.error(err);
    }

    const printArea = document.getElementById('printable-report-area');
    if (!printArea) return;

    const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    const printWin = window.open('', '_blank', 'width=1050,height=850,scrollbars=yes,resizable=yes');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>${reportTitle} - طباعة ومعاينة PDF</title>
          ${styleSheets}
          <style>
            @page {
              size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
              margin: 1cm;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 20px !important;
              font-family: system-ui, -apple-system, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-report-area {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .print-header-bar {
              position: sticky;
              top: 10px;
              z-index: 9999;
              background: #0f172a;
              color: white;
              padding: 14px 24px;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
              margin-bottom: 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              border: 1px solid #334155;
            }
            .print-action-btn {
              background: #059669;
              color: white;
              padding: 10px 20px;
              font-weight: bold;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 15px;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: background 0.2s;
            }
            .print-action-btn:hover {
              background: #047857;
            }
            @media print {
              .print-header-bar {
                display: none !important;
              }
              body {
                padding: 0 !important;
              }
            }
          </style>
        </head>
        <body class="bg-slate-50 text-slate-900" dir="rtl">
          <div class="print-header-bar">
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #f8fafc;">🖨️ وضع الطباعة والتصدير المعتمد</h3>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">يمكنك الآن طباعة التقرير مباشرة أو حفظه كملف PDF على جهازك</p>
            </div>
            <button onclick="window.print()" class="print-action-btn">
              🖨️ اضغط هنا للطباعة الآن أو حفظ كـ PDF
            </button>
          </div>
          <div id="printable-report-area" class="w-full bg-white text-slate-900 shadow-xl rounded-xl overflow-hidden border border-slate-200 p-8">
            ${printArea.innerHTML}
          </div>
        </body>
        </html>
      `);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
      }, 500);
    } else {
      alert("يرجى السماح بالنتوافذ المنبثقة (Popups) في المتصفح لعرض شاشة التصدير والطباعة.");
    }
  };

  const handleCopyText = () => {
    const el = document.getElementById('printable-report-content');
    if (el) {
      navigator.clipboard.writeText(el.innerText || el.textContent || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'compact': return 'text-xs';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex flex-col justify-start items-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto" dir="rtl">
      
      {/* Dynamic Print CSS for Page Isolation and Orientation */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: relative !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            visibility: visible !important;
            display: block !important;
            z-index: 99999 !important;
            overflow: visible !important;
          }
          @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 1.2cm;
          }
        }
      `}</style>

      {/* 1. TOP TOOLBAR & PRINT CONTROLS (Hidden on print) */}
      <div className="w-full max-w-7xl bg-slate-900 text-white rounded-2xl p-4 md:p-5 shadow-2xl mb-6 flex flex-col lg:flex-row items-center justify-between gap-4 border border-slate-700/80 sticky top-2 z-50 print:hidden">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/30 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <span>👁️ وضع معاينة الطباعة (لتقليل الأخطاء)</span>
              </span>
              <h3 className="text-base md:text-lg font-black tracking-tight text-white">{reportTitle}</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate max-w-md">{reportSubtitle}</p>
          </div>
        </div>

        {/* Print Settings Options */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 w-full lg:w-auto text-xs font-bold">
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg">
            <span className="text-slate-400 px-1">الاتجاه:</span>
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 py-1 rounded-md transition ${orientation === 'portrait' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              عمودي (A4)
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 py-1 rounded-md transition ${orientation === 'landscape' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'}`}
            >
              أفقي (عريض)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg">
            <span className="text-slate-400 px-1">حجم الخط:</span>
            <button
              onClick={() => setFontSize('compact')}
              className={`px-2 py-1 rounded-md transition ${fontSize === 'compact' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            >
              مدمج
            </button>
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-1 rounded-md transition ${fontSize === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            >
              عادي
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-1 rounded-md transition ${fontSize === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            >
              مكبر
            </button>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/90 rounded-lg">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showHeader} 
                onChange={(e) => setShowHeader(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-0" 
              />
              <span>الترويسة</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showSignatures} 
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-0" 
              />
              <span>الأختام</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input 
                type="checkbox" 
                checked={showTimestamp} 
                onChange={(e) => setShowTimestamp(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-0" 
              />
              <span>الوقت</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            onClick={handleCopyText}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-1.5 border border-slate-700"
            title="نسخ نص التقرير للحافظة"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer scale-105 hover:scale-105 animate-pulse"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الرسمي الآن</span>
          </button>

          <button
            onClick={handleOpenPrintWindow}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
            title="فتح التقرير في نافذة مخصصة للطباعة أو التصدير كملف PDF"
          >
            <Download className="w-4 h-4" />
            <span>نافذة الطباعة / PDF</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 transition"
            title="إغلاق شاشة المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. OPTIONAL CUSTOM NOTE BAR (Hidden on print unless filled) */}
      <div className="w-full max-w-7xl mb-4 print:hidden">
        <input
          type="text"
          placeholder="إضافة ملاحظة أو توصية خاصة لتظهر أسفل التقرير المطبوع (اختياري)..."
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/20 transition font-medium"
        />
      </div>

      {/* 3. PRINTABLE REPORT CANVAS (Realistic Paper View) */}
      <div 
        id="printable-report-area"
        className={`bg-white text-slate-900 rounded-2xl shadow-2xl transition-all duration-300 relative overflow-hidden border border-slate-200/80 mb-12 p-8 md:p-12 print:m-0 print:p-0 print:shadow-none print:border-none print:rounded-none print:w-full ${
          orientation === 'landscape' ? 'w-full max-w-7xl print:max-w-none' : 'w-full max-w-4xl print:max-w-none'
        } ${getFontSizeClass()}`}
      >
        <div id="printable-report-content" className="relative z-10">
          <UnifiedPrintLayout
            reportTitle={reportTitle}
            reportSubtitle={reportSubtitle}
            reportNumber={serialNo}
            date={dateStr}
            printTime={timeStr}
            userName={adminName}
            showHeader={showHeader}
            showFooter={showTimestamp}
            showSignatures={showSignatures}
            customNote={customNote}
          >
            {children}
          </UnifiedPrintLayout>
        </div>
      </div>

    </div>
  );
};

export type ReportPreviewProps = ReportPreviewModalProps;
export const ReportPreview = ReportPreviewModal;
