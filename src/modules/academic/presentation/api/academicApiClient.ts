/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * Typed fetch client for the verified Academic REST API (Phase 6.0/6.1).
 * All endpoints are mounted on the same-origin Express server under `/api`
 * (served through Vite middleware in dev and static in production), so we use
 * relative `/api` paths exactly like the existing `src/lib/ai-client.ts`.
 *
 * It consumes the real HTTP stack:
 *   HTTP → Express → Router → Controller → Application Service
 *        → Repository → UnitOfWork → EventBus → HTTP Response
 *
 * This client performs NO business logic — it only serializes/deserializes
 * the backend DTOs and surfaces backend error envelopes.
 */

import {
  AcademicYearApi,
  AcademicYearSummaryApi,
  CreateAcademicYearPayload,
  AddAcademicTermPayload,
  CreateYearWithTermsPayload,
  YearLifecyclePayload,
  CurriculumApi,
  SaveCurriculumPayload,
  CourseAssignmentApi,
  SaveCourseAssignmentPayload,
  AcademicCalendarApi,
  SaveAcademicCalendarPayload,
  ApiErrorEnvelope,
} from '../types';

const BASE = '/api/academic';

/** Thrown when the backend returns a non-2xx status with an error envelope. */
export class AcademicApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AcademicApiError';
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const envelope = (parsed ?? {}) as ApiErrorEnvelope;
    const message = envelope.error || `طلب فشل (${res.status})`;
    throw new AcademicApiError(res.status, message);
  }

  return parsed as T;
}

// ── AcademicYear lifecycle ─────────────────────────────────────────────────

export const academicYearApi = {
  create(payload: CreateAcademicYearPayload): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', '/years', payload);
  },

  createWithTerms(payload: CreateYearWithTermsPayload): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', '/years/with-terms', payload);
  },

  addTerm(yearId: string, payload: AddAcademicTermPayload): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/terms`, payload);
  },

  approve(yearId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/approve`, payload);
  },

  activate(yearId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/activate`, payload);
  },

  close(yearId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/close`, payload);
  },

  archive(yearId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/archive`, payload);
  },

  openTerm(yearId: string, termId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/terms/${encodeURIComponent(termId)}/open`, payload);
  },

  lockTerm(yearId: string, termId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/terms/${encodeURIComponent(termId)}/lock`, payload);
  },

  closeTerm(yearId: string, termId: string, payload: Partial<YearLifecyclePayload>): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('POST', `/years/${encodeURIComponent(yearId)}/terms/${encodeURIComponent(termId)}/close`, payload);
  },

  list(status?: string): Promise<AcademicYearSummaryApi[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<AcademicYearSummaryApi[]>('GET', `/years${q}`);
  },

  getById(id: string): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('GET', `/years/${encodeURIComponent(id)}`);
  },

  getByCode(code: string): Promise<AcademicYearApi> {
    return request<AcademicYearApi>('GET', `/years/code/${encodeURIComponent(code)}`);
  },

  delete(id: string): Promise<void> {
    return request<void>('DELETE', `/years/${encodeURIComponent(id)}`);
  },
};

// ── Curriculum ─────────────────────────────────────────────────────────────

export const curriculumApi = {
  save(payload: SaveCurriculumPayload): Promise<CurriculumApi> {
    return request<CurriculumApi>('POST', '/curriculums', payload);
  },

  update(id: string, payload: SaveCurriculumPayload): Promise<CurriculumApi> {
    return request<CurriculumApi>('PUT', `/curriculums/${encodeURIComponent(id)}`, payload);
  },

  list(gradeLevelId?: string): Promise<CurriculumApi[]> {
    const q = gradeLevelId ? `?gradeLevelId=${encodeURIComponent(gradeLevelId)}` : '';
    return request<CurriculumApi[]>('GET', `/curriculums${q}`);
  },

  getById(id: string): Promise<CurriculumApi> {
    return request<CurriculumApi>('GET', `/curriculums/${encodeURIComponent(id)}`);
  },

  getByCode(code: string): Promise<CurriculumApi> {
    return request<CurriculumApi>('GET', `/curriculums/code/${encodeURIComponent(code)}`);
  },

  delete(id: string): Promise<void> {
    return request<void>('DELETE', `/curriculums/${encodeURIComponent(id)}`);
  },
};

// ── CourseAssignment ───────────────────────────────────────────────────────

export const courseAssignmentApi = {
  save(payload: SaveCourseAssignmentPayload): Promise<CourseAssignmentApi> {
    return request<CourseAssignmentApi>('POST', '/course-assignments', payload);
  },

  update(id: string, payload: SaveCourseAssignmentPayload): Promise<CourseAssignmentApi> {
    return request<CourseAssignmentApi>('PUT', `/course-assignments/${encodeURIComponent(id)}`, payload);
  },

  list(): Promise<CourseAssignmentApi[]> {
    return request<CourseAssignmentApi[]>('GET', '/course-assignments');
  },

  getById(id: string): Promise<CourseAssignmentApi> {
    return request<CourseAssignmentApi>('GET', `/course-assignments/${encodeURIComponent(id)}`);
  },

  delete(id: string): Promise<void> {
    return request<void>('DELETE', `/course-assignments/${encodeURIComponent(id)}`);
  },
};

// ── AcademicCalendar ───────────────────────────────────────────────────────

export const academicCalendarApi = {
  save(payload: SaveAcademicCalendarPayload): Promise<AcademicCalendarApi> {
    return request<AcademicCalendarApi>('POST', '/calendar', payload);
  },

  update(id: string, payload: SaveAcademicCalendarPayload): Promise<AcademicCalendarApi> {
    return request<AcademicCalendarApi>('PUT', `/calendar/${encodeURIComponent(id)}`, payload);
  },

  list(): Promise<AcademicCalendarApi[]> {
    return request<AcademicCalendarApi[]>('GET', '/calendar');
  },

  getById(id: string): Promise<AcademicCalendarApi> {
    return request<AcademicCalendarApi>('GET', `/calendar/${encodeURIComponent(id)}`);
  },

  getByDate(date: string): Promise<AcademicCalendarApi> {
    return request<AcademicCalendarApi>('GET', `/calendar/date/${encodeURIComponent(date)}`);
  },

  delete(id: string): Promise<void> {
    return request<void>('DELETE', `/calendar/${encodeURIComponent(id)}`);
  },
};
