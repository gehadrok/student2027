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

  async save(command: SaveAcademicCalendarCommand): Promise<AcademicCalendarDto> {
    const saved = await this.repo.save(toRecord(command));
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

  async delete(command: DeleteAcademicCalendarCommand): Promise<boolean> {
    return this.repo.delete(new SchoolDayId(command.id));
  }

  async getById(id: string): Promise<AcademicCalendarDto> {
    const record = await this.repo.findById(new SchoolDayId(id));
    if (!record) {
      throw new Error(`AcademicCalendar not found: ${id}`);
    }
    return academicCalendarRecordToDto(record);
  }

  async getByDate(query: GetAcademicCalendarByDateQuery): Promise<AcademicCalendarDto> {
    const record = await this.repo.findByDate(new AcademicCalendarDate(new Date(`${query.date}T00:00:00Z`)));
    if (!record) {
      throw new Error(`AcademicCalendar not found for date: ${query.date}`);
    }
    return academicCalendarRecordToDto(record);
  }

  async list(query: ListAcademicCalendarQuery): Promise<AcademicCalendarDto[]> {
    if (query.week !== undefined) {
      const records = await this.repo.getByWeek(new AcademicWeek(query.week));
      return records.map(academicCalendarRecordToDto);
    }
    const records = await this.repo.getAll();
    return records.map(academicCalendarRecordToDto);
  }
}
