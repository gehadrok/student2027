import { Student } from '../aggregates/Student';
import { NotImplementedError } from '../exceptions/NotImplementedError';

export class StudentTransferService {
  transfer(_student: Student): Promise<Student> {
    throw new NotImplementedError();
  }
}
