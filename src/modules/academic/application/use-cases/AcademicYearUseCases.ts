/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * AcademicYearUseCases are thin, named orchestrators that assemble the
 * AcademicYear aggregate lifecycle (create → add terms → approve → activate →
 * close → archive) over the repository. They reuse the Application Services
 * and hold no business rules (all invariants live in the Domain aggregate).
 */

import { AcademicYearService } from '../services/AcademicYearService';
import {
  CreateAcademicYearCommand,
  AddAcademicTermCommand,
  ApproveAcademicYearCommand,
  ActivateAcademicYearCommand,
  CloseAcademicYearCommand,
  ArchiveAcademicYearCommand,
} from '../commands';
import { AcademicYearDto } from '../dtos';

export interface CreateAcademicYearWithTermsCommand {
  year: CreateAcademicYearCommand;
  terms: Omit<AddAcademicTermCommand, 'academicYearId' | 'changedBy'>[];
}

export class AcademicYearUseCases {
  constructor(private readonly service: AcademicYearService) {}

  /**
   * Create an academic year and optionally add its initial terms in one
   * orchestrated workflow.
   */
  async createWithTerms(command: CreateAcademicYearWithTermsCommand): Promise<AcademicYearDto> {
    let dto = await this.service.create(command.year);
    for (const term of command.terms) {
      dto = await this.service.addTerm({
        academicYearId: dto.id,
        changedBy: command.year.createdBy,
        ...term,
      });
    }
    return dto;
  }

  /**
   * Run the full lifecycle to the given target status.
   */
  async progressToActive(
    create: CreateAcademicYearCommand,
    terms: Omit<AddAcademicTermCommand, 'academicYearId' | 'changedBy'>[]
  ): Promise<AcademicYearDto> {
    let dto = await this.createWithTerms({ year: create, terms });
    const by = create.createdBy;
    dto = await this.service.approve({ academicYearId: dto.id, changedBy: by });
    dto = await this.service.activate({ academicYearId: dto.id, changedBy: by });
    return dto;
  }

  async approve(command: ApproveAcademicYearCommand): Promise<AcademicYearDto> {
    return this.service.approve(command);
  }

  async activate(command: ActivateAcademicYearCommand): Promise<AcademicYearDto> {
    return this.service.activate(command);
  }

  async close(command: CloseAcademicYearCommand): Promise<AcademicYearDto> {
    return this.service.close(command);
  }

  async archive(command: ArchiveAcademicYearCommand): Promise<AcademicYearDto> {
    return this.service.archive(command);
  }
}
