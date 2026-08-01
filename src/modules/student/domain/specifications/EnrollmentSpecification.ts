import { Enrollment } from '../entities/Enrollment';
import { NotImplementedError } from '../exceptions/NotImplementedError';
import { Specification } from './Specification';

export class EnrollmentSpecification implements Specification<Enrollment> {
  isSatisfiedBy(_candidate: Enrollment): boolean {
    throw new NotImplementedError();
  }
}
