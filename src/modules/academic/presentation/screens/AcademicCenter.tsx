/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Academic Center — presentation container / hub that exposes the four
 * Academic management areas through a tabbed interface:
 *   - Academic Years (with term lifecycle)
 *   - Curriculums
 *   - Course Assignments
 *   - Academic Calendar
 *
 * This is a thin container only. All data flows through the REAL Academic
 * REST API via the presentation hooks (no mock/static data).
 */

import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, ClipboardList, CalendarDays,
} from 'lucide-react';
import { AcademicYearsScreen } from './AcademicYearsScreen';
import { CurriculumsScreen } from './CurriculumsScreen';
import { CourseAssignmentsScreen } from './CourseAssignmentsScreen';
import { AcademicCalendarScreen } from './AcademicCalendarScreen';

type AcademicTab = 'years' | 'curriculums' | 'course-assignments' | 'calendar';

const TABS: Array<{ id: AcademicTab; label: string; icon: React.ReactNode; desc: string }> = [
  {
    id: 'years',
    label: 'السنوات الدراسية',
    icon: <GraduationCap className="w-5 h-5" />,
    desc: 'إدارة السنوات الدراسية والفصول ودورة الحياة',
  },
  {
    id: 'curriculums',
    label: 'المناهج',
    icon: <BookOpen className="w-5 h-5" />,
    desc: 'إدارة المناهج والمواد الدراسية',
  },
  {
    id: 'course-assignments',
    label: 'التكليفات',
    icon: <ClipboardList className="w-5 h-5" />,
    desc: 'تكليف المدرسين بالمواد والصفوف',
  },
  {
    id: 'calendar',
    label: 'التقويم الأكاديمي',
    icon: <CalendarDays className="w-5 h-5" />,
    desc: 'إدارة أيام التقويم والأسابيع الأكاديمية',
  },
];

export function AcademicCenter() {
  const [activeTab, setActiveTab] = useState<AcademicTab>('years');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">المركز الأكاديمي</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة الهيكل الأكاديمي الكامل — السنوات، المناهج، التكليفات، والتقويم عبر REST API
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-right rounded-2xl border p-4 transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className={`flex items-center gap-2 mb-2 ${isActive ? 'text-white' : 'text-blue-600'}`}>
                {tab.icon}
                <span className="text-sm font-bold">{tab.label}</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                {tab.desc}
              </p>
            </button>
          );
        })}
      </div>

{/* Active screen */}
      <div key={activeTab} className="animate-in fade-in duration-200">
        {activeTab === 'years' && <AcademicYearsScreen />}
        {activeTab === 'curriculums' && <CurriculumsScreen />}
        {activeTab === 'course-assignments' && <CourseAssignmentsScreen />}
        {activeTab === 'calendar' && <AcademicCalendarScreen />}
      </div>
    </div>
  );
}

export default AcademicCenter;
