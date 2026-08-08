/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * AcademicController is a thin HTTP adapter. It only maps request/response
 * payloads to/from the Application Services. It contains NO business logic and
 * NO direct repository access — it delegates entirely to the Application
 * Services (which own orchestration and Domain/UnitOfWork/EventBus usage).
 */

import { Request, Response } from 'express';
import {
  academicYearService,
  curriculumService,
  courseAssignmentService,
  academicCalendarService,
} from '../services';
import { academicYearUseCases } from '../use-cases';

function sendError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Unknown error';
  res.status(400).json({ error: message });
}

// ── AcademicYear ───────────────────────────────────────────────────────────

export function createAcademicYear(req: Request, res: Response): void {
  try {
    res.status(201).json(academicYearService.create(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export function createAcademicYearWithTerms(req: Request, res: Response): void {
  try {
    const { year, terms } = req.body;
    res.status(201).json(academicYearUseCases.createWithTerms({ year, terms: terms ?? [] }));
  } catch (err) {
    sendError(res, err);
  }
}

export function addAcademicTerm(req: Request, res: Response): void {
  try {
    const dto = academicYearService.addTerm({
      academicYearId: req.params.id,
      ...req.body,
    });
    res.status(201).json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export function approveAcademicYear(req: Request, res: Response): void {
  try {
    res.json(academicYearService.approve({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export function activateAcademicYear(req: Request, res: Response): void {
  try {
    res.json(academicYearService.activate({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export function closeAcademicYear(req: Request, res: Response): void {
  try {
    res.json(academicYearService.close({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export function archiveAcademicYear(req: Request, res: Response): void {
  try {
    res.json(academicYearService.archive({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export function openTerm(req: Request, res: Response): void {
  try {
    const dto = academicYearService.openTerm({
      academicYearId: req.params.id,
      termId: req.params.termId,
      ...req.body,
    });
    res.json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export function lockTerm(req: Request, res: Response): void {
  try {
    const dto = academicYearService.lockTerm({
      academicYearId: req.params.id,
      termId: req.params.termId,
      ...req.body,
    });
    res.json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export function closeTerm(req: Request, res: Response): void {
  try {
    const dto = academicYearService.closeTerm({
      academicYearId: req.params.id,
      termId: req.params.termId,
      ...req.body,
    });
    res.json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export function getAcademicYearById(req: Request, res: Response): void {
  try {
    res.json(academicYearService.getById({ id: req.params.id }));
  } catch (err) {
    sendError(res, err);
  }
}

export function getAcademicYearByCode(req: Request, res: Response): void {
  try {
    res.json(academicYearService.getByCode({ code: req.params.code }));
  } catch (err) {
    sendError(res, err);
  }
}

export function listAcademicYears(req: Request, res: Response): void {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(academicYearService.list({ status }));
  } catch (err) {
    sendError(res, err);
  }
}

export function deleteAcademicYear(req: Request, res: Response): void {
  try {
    academicYearService.delete({ academicYearId: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

// ── Curriculum ─────────────────────────────────────────────────────────────

export function saveCurriculum(req: Request, res: Response): void {
  try {
    res.status(201).json(curriculumService.save(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export function deleteCurriculum(req: Request, res: Response): void {
  try {
    curriculumService.delete({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export function getCurriculumById(req: Request, res: Response): void {
  try {
    res.json(curriculumService.getById({ id: req.params.id }));
  } catch (err) {
    sendError(res, err);
  }
}

export function getCurriculumByCode(req: Request, res: Response): void {
  try {
    res.json(curriculumService.getByCode({ code: req.params.code }));
  } catch (err) {
    sendError(res, err);
  }
}

export function listCurriculums(req: Request, res: Response): void {
  try {
    const gradeLevelId = typeof req.query.gradeLevelId === 'string' ? req.query.gradeLevelId : undefined;
    const activeOnly = req.query.activeOnly === 'false' ? false : true;
    res.json(curriculumService.list({ gradeLevelId, activeOnly }));
  } catch (err) {
    sendError(res, err);
  }
}

// ── CourseAssignment ───────────────────────────────────────────────────────

export function saveCourseAssignment(req: Request, res: Response): void {
  try {
    res.status(201).json(courseAssignmentService.save(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export function deleteCourseAssignment(req: Request, res: Response): void {
  try {
    courseAssignmentService.delete({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export function getCourseAssignmentById(req: Request, res: Response): void {
  try {
    res.json(courseAssignmentService.getById({ id: req.params.id }));
  } catch (err) {
    sendError(res, err);
  }
}

export function listCourseAssignments(req: Request, res: Response): void {
  try {
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
    const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;
    const gradeLevelId = typeof req.query.gradeLevelId === 'string' ? req.query.gradeLevelId : undefined;
    res.json(courseAssignmentService.list({ subjectId, teacherId, gradeLevelId }));
  } catch (err) {
    sendError(res, err);
  }
}

// ── AcademicCalendar ───────────────────────────────────────────────────────

export function saveAcademicCalendar(req: Request, res: Response): void {
  try {
    res.status(201).json(academicCalendarService.save(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export function deleteAcademicCalendar(req: Request, res: Response): void {
  try {
    academicCalendarService.delete({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export function getAcademicCalendarById(req: Request, res: Response): void {
  try {
    res.json(academicCalendarService.getById(req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

export function getAcademicCalendarByDate(req: Request, res: Response): void {
  try {
    res.json(academicCalendarService.getByDate({ date: req.params.date }));
  } catch (err) {
    sendError(res, err);
  }
}

export function listAcademicCalendar(req: Request, res: Response): void {
  try {
    const week = typeof req.query.week === 'string' ? Number(req.query.week) : undefined;
    res.json(academicCalendarService.list({ week }));
  } catch (err) {
    sendError(res, err);
  }
}
