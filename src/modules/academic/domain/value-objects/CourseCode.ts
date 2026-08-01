import { CodeValue } from './CodeValue';

/**
 * Course code for a course offering within the academic catalog.
 * Normalized uppercase alphanumeric with hyphens, 2-32 characters.
 */
export class CourseCode extends CodeValue {
  constructor(value: string) {
    super(value, 'CourseCode');
  }
}

