import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';
import { StudentProjection } from './StudentProjection';

export class StudentProjectionRepository {
  findByStudentId(_studentId: string): Promise<StudentProjection | null> {
    throw new NotImplementedError();
  }
}
