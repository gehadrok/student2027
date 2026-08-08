/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer — REST endpoints.
 *
 * Mounts the Academic REST API. All handlers delegate to the thin
 * AcademicController, which in turn delegates to Application Services only.
 * No business logic or repository access lives at the route layer.
 */

import { Router } from 'express';
import * as ctrl from '../application/controllers/academicController';

export function createAcademicRouter(): Router {
  const router = Router();

  // ── AcademicYear lifecycle ───────────────────────────────────────────────
  router.post('/academic/years', ctrl.createAcademicYear);
  router.post('/academic/years/with-terms', ctrl.createAcademicYearWithTerms);
  router.post('/academic/years/:id/terms', ctrl.addAcademicTerm);
  router.post('/academic/years/:id/approve', ctrl.approveAcademicYear);
  router.post('/academic/years/:id/activate', ctrl.activateAcademicYear);
  router.post('/academic/years/:id/close', ctrl.closeAcademicYear);
  router.post('/academic/years/:id/archive', ctrl.archiveAcademicYear);
  router.post('/academic/years/:id/terms/:termId/open', ctrl.openTerm);
  router.post('/academic/years/:id/terms/:termId/lock', ctrl.lockTerm);
  router.post('/academic/years/:id/terms/:termId/close', ctrl.closeTerm);
  router.get('/academic/years', ctrl.listAcademicYears);
  router.get('/academic/years/code/:code', ctrl.getAcademicYearByCode);
  router.get('/academic/years/:id', ctrl.getAcademicYearById);
  router.delete('/academic/years/:id', ctrl.deleteAcademicYear);

  // ── Curriculum ───────────────────────────────────────────────────────────
  router.post('/academic/curriculums', ctrl.saveCurriculum);
  router.put('/academic/curriculums/:id', ctrl.saveCurriculum);
  router.get('/academic/curriculums', ctrl.listCurriculums);
  router.get('/academic/curriculums/code/:code', ctrl.getCurriculumByCode);
  router.get('/academic/curriculums/:id', ctrl.getCurriculumById);
  router.delete('/academic/curriculums/:id', ctrl.deleteCurriculum);

  // ── CourseAssignment ─────────────────────────────────────────────────────
  router.post('/academic/course-assignments', ctrl.saveCourseAssignment);
  router.put('/academic/course-assignments/:id', ctrl.saveCourseAssignment);
  router.get('/academic/course-assignments', ctrl.listCourseAssignments);
  router.get('/academic/course-assignments/:id', ctrl.getCourseAssignmentById);
  router.delete('/academic/course-assignments/:id', ctrl.deleteCourseAssignment);

  // ── AcademicCalendar ─────────────────────────────────────────────────────
  router.post('/academic/calendar', ctrl.saveAcademicCalendar);
  router.put('/academic/calendar/:id', ctrl.saveAcademicCalendar);
  router.get('/academic/calendar', ctrl.listAcademicCalendar);
  router.get('/academic/calendar/date/:date', ctrl.getAcademicCalendarByDate);
  router.get('/academic/calendar/:id', ctrl.getAcademicCalendarById);
  router.delete('/academic/calendar/:id', ctrl.deleteAcademicCalendar);

  return router;
}

export default createAcademicRouter;
