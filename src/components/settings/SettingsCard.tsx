import React from 'react';

interface SettingsCardProps {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  id,
  title,
  description,
  icon,
  badge,
  children,
  headerAction,
  className = ''
}) => {
  return (
    <div
      id={id}
      className={`bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${className}`}
    >
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-3 rounded-2xl bg-teal-50 border border-teal-100/60 text-teal-700 shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {badge && (
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div className="p-5 sm:p-6 space-y-5">{children}</div>
    </div>
  );
};
