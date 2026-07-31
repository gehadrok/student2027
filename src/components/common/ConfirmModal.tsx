import React from 'react';
import { AlertTriangle, X, CheckCircle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد الإجراء',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          bgIcon: 'bg-amber-100',
          btn: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          bgIcon: 'bg-blue-100',
          btn: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
      case 'danger':
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-600" />,
          bgIcon: 'bg-rose-100',
          btn: 'bg-rose-600 hover:bg-rose-700 text-white'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${styles.bgIcon}`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${styles.btn}`}
          >
            {isLoading ? 'جاري المعالجة...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
