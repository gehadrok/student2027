/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IDashboardRepository } from '../../../core/repositories/IDashboardRepository';
import { dashboardRepository } from '../repository/dashboardRepository';
import {
  DashboardKpis,
  TopStudent,
  StrugglingStudent,
  ClassAbsence,
  UpcomingExam,
} from '../types';
import { AppNotification, SchoolSettings } from '../../../types';

/**
 * Dashboard service — business logic for the admin dashboard.
 * Consumes the DashboardRepository (which in turn consumes other repositories).
 * No direct data access here — only orchestration.
 */
export class DashboardService {
  private dashboardRepo: IDashboardRepository;

  constructor(dashboardRepo?: IDashboardRepository) {
    this.dashboardRepo = dashboardRepo || dashboardRepository;
  }

  /**
   * Get aggregated KPIs for the dashboard.
   */
  getKpis(): DashboardKpis {
    return this.dashboardRepo.getKpis();
  }

  /**
   * Get top-performing students.
   */
  getTopStudents(limit: number = 5): TopStudent[] {
    return this.dashboardRepo.getTopStudents(limit);
  }

  /**
   * Get struggling / at-risk students.
   */
  getStrugglingStudents(): StrugglingStudent[] {
    return this.dashboardRepo.getStrugglingStudents();
  }

  /**
   * Get classes sorted by highest absence rates.
   */
  getMostAbsentClasses(): ClassAbsence[] {
    return this.dashboardRepo.getMostAbsentClasses();
  }

  /**
   * Get student distribution across classes (for chart).
   */
  getClassDistribution(): { name: string; count: number }[] {
    return this.dashboardRepo.getClassDistribution();
  }

  /**
   * Get attendance status breakdown (for pie chart).
   */
  getAttendanceBreakdown(): { name: string; value: number; color: string }[] {
    return this.dashboardRepo.getAttendanceBreakdown();
  }

  /**
   * Get app notifications.
   */
  getNotifications(): AppNotification[] {
    return this.dashboardRepo.getNotifications();
  }

  /**
   * Get school settings.
   */
  getSettings(): SchoolSettings {
    return this.dashboardRepo.getSettings();
  }

  /**
   * Get upcoming exams (static data for now — will be replaced with DB query).
   */
  getUpcomingExams(): UpcomingExam[] {
    return [
      {
        id: 'ex1',
        title: 'اختبار نصف الفصل - الرياضيات العامة',
        subject: 'الرياضيات العامة',
        className: 'الصف الأول الثانوي',
        date: '2026-08-05',
        time: '08:30 ص',
        daysLeft: 7,
        type: 'نصف الفصل',
      },
      {
        id: 'ex2',
        title: 'الاختبار العملي - الكيمياء العامة',
        subject: 'الكيمياء العامة',
        className: 'الصف الأول الثانوي',
        date: '2026-08-08',
        time: '10:00 ص',
        daysLeft: 10,
        type: 'عملي',
      },
      {
        id: 'ex3',
        title: 'اختبار تقييم الفيزياء المتقدمة',
        subject: 'الفيزياء المتقدمة',
        className: 'الصف الثاني الثانوي',
        date: '2026-08-12',
        time: '09:00 ص',
        daysLeft: 14,
        type: 'شائك',
      },
      {
        id: 'ex4',
        title: 'اختبار الحاسب والذكاء الاصطناعي',
        subject: 'الحاسب الآلي',
        className: 'الصف الثالث الثانوي',
        date: '2026-08-15',
        time: '11:00 ص',
        daysLeft: 17,
        type: 'نهائي',
      },
    ];
  }
}

// Singleton instance
export const dashboardService = new DashboardService();

