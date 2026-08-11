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

export async function createAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await academicYearService.create(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function createAcademicYearWithTerms(req: Request, res: Response): Promise<void> {
  try {
    const { year, terms } = req.body;
    res.status(201).json(await academicYearUseCases.createWithTerms({ year, terms: terms ?? [] }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function addAcademicTerm(req: Request, res: Response): Promise<void> {
  try {
    const dto = await academicYearService.addTerm({
      academicYearId: req.params.id,
      ...req.body,
    });
    res.status(201).json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export async function approveAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicYearService.approve({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function activateAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicYearService.activate({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function closeAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicYearService.close({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function archiveAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicYearService.archive({ academicYearId: req.params.id, ...req.body }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function openTerm(req: Request, res: Response): Promise<void> {
  try {
    const dto = await academicYearService.openTerm({
      academicYearId: req.params.id,
      termId: req.params.termId,
      ...req.body,
    });
    res.json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export async function lockTerm(req: Request, res: Response): Promise<void> {
  try {
    const dto = await academicYearService.lockTerm({
      academicYearId: req.params.id,
      termId: req.params.termId,
      ...req.body,
    });
    res.json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export async function closeTerm(req: Request, res: Response): Promise<void> {
  try {
    const dto = await academicYearService.closeTerm({
      academicYearId: req.params.id,
      termId: req.params.termId,
      ...req.body,
    });
    res.json(dto);
  } catch (err) {
    sendError(res, err);
  }
}

export async function getAcademicYearById(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicYearService.getById({ id: req.params.id }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function getAcademicYearByCode(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicYearService.getByCode({ code: req.params.code }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function listAcademicYears(req: Request, res: Response): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await academicYearService.list({ status }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteAcademicYear(req: Request, res: Response): Promise<void> {
  try {
    await academicYearService.delete({ academicYearId: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

// ── Curriculum ─────────────────────────────────────────────────────────────

export async function saveCurriculum(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await curriculumService.save(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteCurriculum(req: Request, res: Response): Promise<void> {
  try {
    await curriculumService.delete({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export async function getCurriculumById(req: Request, res: Response): Promise<void> {
  try {
    res.json(await curriculumService.getById({ id: req.params.id }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function getCurriculumByCode(req: Request, res: Response): Promise<void> {
  try {
    res.json(await curriculumService.getByCode({ code: req.params.code }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function listCurriculums(req: Request, res: Response): Promise<void> {
  try {
    const gradeLevelId = typeof req.query.gradeLevelId === 'string' ? req.query.gradeLevelId : undefined;
    const activeOnly = req.query.activeOnly === 'false' ? false : true;
    res.json(await curriculumService.list({ gradeLevelId, activeOnly }));
  } catch (err) {
    sendError(res, err);
  }
}

// ── CourseAssignment ───────────────────────────────────────────────────────

export async function saveCourseAssignment(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await courseAssignmentService.save(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteCourseAssignment(req: Request, res: Response): Promise<void> {
  try {
    await courseAssignmentService.delete({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export async function getCourseAssignmentById(req: Request, res: Response): Promise<void> {
  try {
    res.json(await courseAssignmentService.getById({ id: req.params.id }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function listCourseAssignments(req: Request, res: Response): Promise<void> {
  try {
    const subjectId = typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined;
    const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId : undefined;
    const gradeLevelId = typeof req.query.gradeLevelId === 'string' ? req.query.gradeLevelId : undefined;
    res.json(await courseAssignmentService.list({ subjectId, teacherId, gradeLevelId }));
  } catch (err) {
    sendError(res, err);
  }
}

// ── AcademicCalendar ───────────────────────────────────────────────────────

export async function saveAcademicCalendar(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await academicCalendarService.save(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteAcademicCalendar(req: Request, res: Response): Promise<void> {
  try {
    await academicCalendarService.delete({ id: req.params.id });
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export async function getAcademicCalendarById(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicCalendarService.getById(req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

export async function getAcademicCalendarByDate(req: Request, res: Response): Promise<void> {
  try {
    res.json(await academicCalendarService.getByDate({ date: req.params.date }));
  } catch (err) {
    sendError(res, err);
  }
}

export async function listAcademicCalendar(req: Request, res: Response): Promise<void> {
  try {
    const week = typeof req.query.week === 'string' ? Number(req.query.week) : undefined;
    res.json(await academicCalendarService.list({ week }));
  } catch (err) {
    sendError(res, err);
  }
}
