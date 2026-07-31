/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dashboard KPI data structure.
 */
export interface DashboardKpis {
  totalStudents: number;
  presentStudentsCount: number;
  absentStudentsCount: number;
  studentAttendanceRate: number;
  totalTeachers: number;
  presentTeachersCount: number;
  absentTeachersCount: number;
  teacherAttendanceRate: number;
  feesCollectedToday: number;
  todayTransactionsCount: number;
  overdueFeesTotal: number;
  overdueCount: number;
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
}

/**
 * Top student data for dashboard.
 */
export interface TopStudent {
  id: string;
  name: string;
  className: string;
  gpa: number;
  percentage: number;
  rank: number;
  photo?: string;
}

/**
 * Struggling student data for dashboard.
 */
export interface StrugglingStudent {
  id: string;
  name: string;
  className: string;
  reason: string;
  gpa: number;
  riskLevel: string;
  photo?: string;
}

/**
 * Class absence data for dashboard.
 */
export interface ClassAbsence {
  id: string;
  name: string;
  studentCount: number;
  absentCount: number;
  absenceRate: number;
}

/**
 * Exam data for dashboard.
 */
export interface UpcomingExam {
  id: string;
  title: string;
  subject: string;
  className: string;
  date: string;
  time: string;
  daysLeft: number;
  type: string;
}

