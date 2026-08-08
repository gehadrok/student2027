/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * AcademicCalendarService provides CRUD + query orchestration over the
 * IAcademicCalendarRepository. Orchestration-only; no business rules.
 */

import { IAcademicCalendarRepository, AcademicCalendarRecord } from '../../domain/repositories/IAcademicCalendarRepository';
import { SchoolDayId } from '../../domain/value-objects/SchoolDayId';
import { AcademicWeek } from '../../domain/value-objects/AcademicWeek';
import { AcademicCalendarDate } from '../../domain/value-objects/AcademicCalendarDate';
import { SaveAcademicCalendarCommand, DeleteAcademicCalendarCommand } from '../commands';
import { GetAcademicCalendarByDateQuery, ListAcademicCalendarQuery } from '../queries';
import { AcademicCalendarDto } from '../dtos';
import { academicCalendarRecordToDto } from '../mappers';

function toRecord(command: SaveAcademicCalendarCommand): AcademicCalendarRecord {
  return {
    id: command.id,
    date: command.date,
    isInstructional: command.isInstructional,
    academicWeek: command.academicWeek,
  };
}

export class AcademicCalendarService {
  constructor(private readonly repo: IAcademicCalendarRepository) {}

  save(command: SaveAcademicCalendarCommand): AcademicCalendarDto {
    const saved = this.repo.save(toRecord(command));
    if (!saved) {
      // AcademicCalendar new-record insert is a documented persistence no-op
      // until a dedicated table exists; return the DTO from the record.
      return {
        id: command.id,
        date: command.date,
        isInstructional: command.isInstructional,
        academicWeek: command.academicWeek,
      };
    }
    return academicCalendarRecordToDto(saved);
  }

  delete(command: DeleteAcademicCalendarCommand): boolean {
    return this.repo.delete(new SchoolDayId(command.id));
  }

  getById(id: string): AcademicCalendarDto {
    const record = this.repo.findById(new SchoolDayId(id));
    if (!record) {
      throw new Error(`AcademicCalendar not found: ${id}`);
    }
    return academicCalendarRecordToDto(record);
  }

  getByDate(query: GetAcademicCalendarByDateQuery): AcademicCalendarDto {
    const record = this.repo.findByDate(new AcademicCalendarDate(new Date(`${query.date}T00:00:00Z`)));
    if (!record) {
      throw new Error(`AcademicCalendar not found for date: ${query.date}`);
    }
    return academicCalendarRecordToDto(record);
  }

  list(query: ListAcademicCalendarQuery): AcademicCalendarDto[] {
    if (query.week !== undefined) {
      return this.repo.getByWeek(new AcademicWeek(query.week)).map(academicCalendarRecordToDto);
    }
    return this.repo.getAll().map(academicCalendarRecordToDto);
  }
}
