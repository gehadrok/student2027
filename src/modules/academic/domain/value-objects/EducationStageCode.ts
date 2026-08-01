import { CodeValue } from './CodeValue';

/**
 * Education stage code such as PRIMARY, SECONDARY.
 * Normalized uppercase alphanumeric with hyphens, 2-32 characters.
 */
export class EducationStageCode extends CodeValue {
  constructor(value: string) {
    super(value, 'EducationStageCode');
  }
}

