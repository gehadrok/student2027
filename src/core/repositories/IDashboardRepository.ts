/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Student,
  Teacher,
  SchoolClass,
  FeePayment,
  ExpenseRecord,
  AttendanceRecord,
  Certificate,
  AppNotification,
  SchoolSettings,
} from '../../types';

/**
 * Dashboard KPIs data structure.
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
 * Repository interface for Dashboard data aggregation.
 * Consumes other repositories (not raw dataSource).
 */
export interface IDashboardRepository {
  getKpis(): Promise<DashboardKpis>;
  getTopStudents(limit?: number): Promise<any[]>;
  getStrugglingStudents(): Promise<any[]>;
  getMostAbsentClasses(): Promise<any[]>;
  getClassDistribution(): Promise<{ name: string; count: number }[]>;
  getAttendanceBreakdown(): Promise<{ name: string; value: number; color: string }[]>;
  getNotifications(): Promise<AppNotification[]>;
  getSettings(): Promise<SchoolSettings>;
}

