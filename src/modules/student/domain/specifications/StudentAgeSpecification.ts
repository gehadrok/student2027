import { Student } from '../aggregates/Student';
import { NotImplementedError } from '../exceptions/NotImplementedError';
import { Specification } from './Specification';

export class StudentAgeSpecification implements Specification<Student> {
  isSatisfiedBy(_candidate: Student): boolean {
    throw new NotImplementedError();
  }
}
