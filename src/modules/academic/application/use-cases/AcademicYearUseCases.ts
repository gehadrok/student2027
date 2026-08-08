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
  createWithTerms(command: CreateAcademicYearWithTermsCommand): AcademicYearDto {
    let dto = this.service.create(command.year);
    for (const term of command.terms) {
      dto = this.service.addTerm({
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
  progressToActive(
    create: CreateAcademicYearCommand,
    terms: Omit<AddAcademicTermCommand, 'academicYearId' | 'changedBy'>[]
  ): AcademicYearDto {
    let dto = this.createWithTerms({ year: create, terms });
    const by = create.createdBy;
    dto = this.service.approve({ academicYearId: dto.id, changedBy: by });
    dto = this.service.activate({ academicYearId: dto.id, changedBy: by });
    return dto;
  }

  approve(command: ApproveAcademicYearCommand): AcademicYearDto {
    return this.service.approve(command);
  }

  activate(command: ActivateAcademicYearCommand): AcademicYearDto {
    return this.service.activate(command);
  }

  close(command: CloseAcademicYearCommand): AcademicYearDto {
    return this.service.close(command);
  }

  archive(command: ArchiveAcademicYearCommand): AcademicYearDto {
    return this.service.archive(command);
  }
}
