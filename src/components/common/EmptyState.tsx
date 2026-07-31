import React from 'react';
import { Inbox, Search, AlertCircle, FolderOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'search' | 'data' | 'error' | 'filter';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا يوجد بيانات لعرضها',
  description = 'لم نتمكن من العثور على أي سجلاّت تطابق معايير العرض الحالية.',
  icon,
  actionLabel,
  onAction,
  type = 'data'
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'search':
        return <Search className="w-8 h-8 text-slate-400" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-rose-500" />;
      case 'filter':
        return <FolderOpen className="w-8 h-8 text-amber-500" />;
      case 'data':
      default:
        return <Inbox className="w-8 h-8 text-teal-600" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-4 shadow-xs">
        {icon || getDefaultIcon()}
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/10 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
