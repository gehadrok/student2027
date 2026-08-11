/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * AcademicYearService orchestrates the AcademicYear aggregate lifecycle.
 * It translates command DTOs into Domain objects, delegates to the repository
 * (which owns UnitOfWork + EventBus dispatch), and returns response DTOs.
 * No business rules live here — they are enforced by the Domain aggregate.
 */

import { IAcademicYearRepository } from '../../domain/repositories/IAcademicYearRepository';
import { AcademicYear } from '../../domain/aggregates/AcademicYear';
import { AcademicTerm } from '../../domain/entities/AcademicTerm';
import { AcademicYearId } from '../../domain/value-objects/AcademicYearId';
import { AcademicYearCode } from '../../domain/value-objects/AcademicYearCode';
import { AcademicTermId } from '../../domain/value-objects/AcademicTermId';
import { AcademicTermCode } from '../../domain/value-objects/AcademicTermCode';
import { SchoolScopeId } from '../../domain/value-objects/SchoolScopeId';
import { DateRange } from '../../domain/value-objects/DateRange';
import {
  CreateAcademicYearCommand,
  AddAcademicTermCommand,
  ApproveAcademicYearCommand,
  ActivateAcademicYearCommand,
  CloseAcademicYearCommand,
  ArchiveAcademicYearCommand,
  OpenTermCommand,
  LockTermCommand,
  CloseTermCommand,
  DeleteAcademicYearCommand,
} from '../commands';
import {
  GetAcademicYearByIdQuery,
  GetAcademicYearByCodeQuery,
  ListAcademicYearsQuery,
} from '../queries';
import { AcademicYearDto, AcademicYearSummaryDto } from '../dtos';
import { academicYearToDto, academicYearToSummaryDto } from '../mappers';

function requireYear(year: AcademicYear | null, id: string): AcademicYear {
  if (!year) {
    throw new Error(`AcademicYear not found: ${id}`);
  }
  return year;
}

export class AcademicYearService {
  constructor(private readonly repo: IAcademicYearRepository) {}

  // ── Commands ─────────────────────────────────────────────────────────────

  async create(command: CreateAcademicYearCommand): Promise<AcademicYearDto> {
    const year = AcademicYear.create({
      id: new AcademicYearId(command.id),
      code: new AcademicYearCode(command.code),
      schoolScopeId: new SchoolScopeId(command.schoolScopeId),
      dateRange: new DateRange({
        startDate: new Date(command.startDate),
        endDate: new Date(command.endDate),
      }),
      createdBy: command.createdBy,
      ministryReferenceCode: command.ministryReferenceCode,
    });
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), year.id.toString()));
  }

  async addTerm(command: AddAcademicTermCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    const term = new AcademicTerm({
      id: new AcademicTermId(command.id),
      code: new AcademicTermCode(command.code),
      dateRange: new DateRange({
        startDate: new Date(command.startDate),
        endDate: new Date(command.endDate),
      }),
    });
    year.addTerm(term, command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async approve(command: ApproveAcademicYearCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.approve(command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async activate(command: ActivateAcademicYearCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.activate(command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async close(command: CloseAcademicYearCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.close(command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async archive(command: ArchiveAcademicYearCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.archive(command.reason, command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async openTerm(command: OpenTermCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.openTerm(new AcademicTermId(command.termId), command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async lockTerm(command: LockTermCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.lockTerm(new AcademicTermId(command.termId), command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async closeTerm(command: CloseTermCommand): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(command.academicYearId)), command.academicYearId);
    year.closeTerm(new AcademicTermId(command.termId), command.changedBy);
    await this.repo.save(year);
    return academicYearToDto(requireYear(await this.repo.findById(year.id), command.academicYearId));
  }

  async delete(command: DeleteAcademicYearCommand): Promise<boolean> {
    return this.repo.delete(new AcademicYearId(command.academicYearId));
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  async getById(query: GetAcademicYearByIdQuery): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findById(new AcademicYearId(query.id)), query.id);
    return academicYearToDto(year);
  }

  async getByCode(query: GetAcademicYearByCodeQuery): Promise<AcademicYearDto> {
    const year = requireYear(await this.repo.findByCode(new AcademicYearCode(query.code)), query.code);
    return academicYearToDto(year);
  }

  async list(query: ListAcademicYearsQuery): Promise<AcademicYearSummaryDto[]> {
    const years = await this.repo.getAll();
    const filtered = query.status ? years.filter((y) => y.status === query.status) : years;
    return filtered.map(academicYearToSummaryDto);
  }
}
