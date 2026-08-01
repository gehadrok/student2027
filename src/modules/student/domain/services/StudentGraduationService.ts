import { Student } from '../aggregates/Student';
import { NotImplementedError } from '../exceptions/NotImplementedError';

export class StudentGraduationService {
  graduate(_student: Student): Promise<Student> {
    throw new NotImplementedError();
  }
}
