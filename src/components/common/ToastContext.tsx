import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* TOAST CONTAINER */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none" dir="rtl">
        {toasts.map((toast) => {
          const getIcon = () => {
            switch (toast.type) {
              case 'error':
                return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
              case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
              case 'info':
                return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
              case 'success':
              default:
                return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
            }
          };

          const getBg = () => {
            switch (toast.type) {
              case 'error':
                return 'bg-slate-900 border-rose-500/40 text-white';
              case 'warning':
                return 'bg-slate-900 border-amber-500/40 text-white';
              case 'info':
                return 'bg-slate-900 border-blue-500/40 text-white';
              case 'success':
              default:
                return 'bg-slate-900 border-emerald-500/40 text-white';
            }
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl flex items-start justify-between gap-3 animate-in slide-in-from-bottom-4 duration-300 ${getBg()}`}
            >
              <div className="flex items-start gap-3">
                {getIcon()}
                <div>
                  {toast.title && <h5 className="text-xs font-bold mb-0.5">{toast.title}</h5>}
                  <p className="text-xs text-slate-200 leading-snug">{toast.message}</p>
                </div>
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
