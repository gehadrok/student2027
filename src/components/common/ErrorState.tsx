import React from 'react';
import { AlertOctagon, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'حدث خطأ في تحميل البيانات',
  message = 'تعذر الاتصال بالسيرفر أو معالجة الطلب المطلوب. يرجى المحاولة مرة أخرى.',
  onRetry,
  onGoHome
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-rose-50/40 rounded-3xl border border-rose-200 animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-rose-100 text-rose-600 mb-4 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-600 max-w-md mb-6 leading-relaxed">{message}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
        )}
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>
        )}
      </div>
    </div>
  );
};
