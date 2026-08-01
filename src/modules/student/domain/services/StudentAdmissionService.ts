import { Student } from '../aggregates/Student';
import { NotImplementedError } from '../exceptions/NotImplementedError';

export class StudentAdmissionService {
  admit(_student: Student): Promise<Student> {
    throw new NotImplementedError();
  }
}
