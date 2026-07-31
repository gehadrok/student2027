import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text', 
  count = 1 
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-xl';
      case 'card':
        return 'rounded-2xl h-32 w-full';
      case 'text':
      default:
        return 'rounded-md h-4 w-full';
    }
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`bg-slate-200/80 animate-pulse ${getVariantStyle()} ${className}`}
    />
  ));

  if (count === 1) return skeletons[0];

  return <div className="space-y-2.5 w-full">{skeletons}</div>;
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 5 
}) => {
  return (
    <div className="w-full space-y-3 p-4 bg-white rounded-2xl border border-slate-200 animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <Skeleton variant="rectangular" className="h-6 w-32" />
        <Skeleton variant="rectangular" className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-2">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} variant="text" className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="w-24 h-4" />
            <Skeleton variant="circular" className="w-10 h-10" />
          </div>
          <Skeleton className="w-16 h-8" />
          <Skeleton className="w-32 h-3" />
        </div>
      ))}
    </div>
  );
};
