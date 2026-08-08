/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Small presentational helper that renders an Academic status/value badge
 * using the existing design-system color tokens.
 */

import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-amber-50 text-amber-700 border-amber-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
  planned: 'bg-slate-100 text-slate-600 border-slate-200',
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  locked: 'bg-amber-50 text-amber-700 border-amber-200',
};

const LABELS: Record<string, string> = {
  draft: 'مسودة',
  approved: 'معتمد',
  active: 'نشط',
  closed: 'مغلق',
  archived: 'مؤرشف',
  planned: 'مخطط',
  open: 'مفتوح',
  locked: 'مقفل',
};

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const label = LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${style}`}>
      {label}
    </span>
  );
};
