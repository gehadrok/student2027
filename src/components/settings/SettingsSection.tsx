import React from 'react';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  cols = 2,
  className = ''
}) => {
  const getGridCols = () => {
    switch (cols) {
      case 1:
        return 'grid-cols-1';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 2:
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div className="pb-1 border-b border-slate-100">
          {title && <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>}
          {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}

      <div className={`grid ${getGridCols()} gap-4`}>{children}</div>
    </div>
  );
};
