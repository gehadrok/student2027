/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.0 — Academic Application Layer.
 *
 * CurriculumService provides CRUD + query orchestration over the
 * ICurriculumRepository. It is orchestration-only; all data shapes flow
 * through the repository contracts.
 */

import { ICurriculumRepository, CurriculumRecord } from '../../domain/repositories/ICurriculumRepository';
import { CurriculumId } from '../../domain/value-objects/CurriculumId';
import { CurriculumCode } from '../../domain/value-objects/CurriculumCode';
import { GradeLevelId } from '../../domain/value-objects/GradeLevelId';
import { EducationStageId } from '../../domain/value-objects/EducationStageId';
import { SaveCurriculumCommand, DeleteCurriculumCommand } from '../commands';
import { GetCurriculumByIdQuery, GetCurriculumByCodeQuery, ListCurriculumsQuery } from '../queries';
import { CurriculumDto } from '../dtos';
import { curriculumRecordToDto } from '../mappers';

function toRecord(command: SaveCurriculumCommand): CurriculumRecord {
  return {
    id: command.id,
    code: command.code,
    nameAr: command.nameAr,
    nameEn: command.nameEn,
    description: command.description,
    educationStageId: command.educationStageId,
    gradeLevelId: command.gradeLevelId,
    isActive: command.isActive,
    displayOrder: command.displayOrder,
  };
}

export class CurriculumService {
  constructor(private readonly repo: ICurriculumRepository) {}

  async save(command: SaveCurriculumCommand): Promise<CurriculumDto> {
    const saved = await this.repo.save(toRecord(command));
    if (!saved) {
      throw new Error(`Curriculum save failed: ${command.id}`);
    }
    return curriculumRecordToDto(saved);
  }

  async delete(command: DeleteCurriculumCommand): Promise<boolean> {
    return this.repo.delete(new CurriculumId(command.id));
  }

  async getById(query: GetCurriculumByIdQuery): Promise<CurriculumDto> {
    const record = await this.repo.findById(new CurriculumId(query.id));
    if (!record) {
      throw new Error(`Curriculum not found: ${query.id}`);
    }
    return curriculumRecordToDto(record);
  }

  async getByCode(query: GetCurriculumByCodeQuery): Promise<CurriculumDto> {
    const record = await this.repo.findByCode(new CurriculumCode(query.code));
    if (!record) {
      throw new Error(`Curriculum not found by code: ${query.code}`);
    }
    return curriculumRecordToDto(record);
  }

  async list(query: ListCurriculumsQuery): Promise<CurriculumDto[]> {
    if (query.gradeLevelId) {
      const records = await this.repo.getByGradeLevel(new GradeLevelId(query.gradeLevelId));
      return records.map(curriculumRecordToDto);
    }
    const records = await this.repo.getAll(query.activeOnly ?? true);
    return records.map(curriculumRecordToDto);
  }

  async listByStage(stageId: string): Promise<CurriculumDto[]> {
    const records = await this.repo.getByStage(new EducationStageId(stageId));
    return records.map(curriculumRecordToDto);
  }
}
