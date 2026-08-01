import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';
import { IStudentReadRepository, StudentReadModel, StudentSearchCriteria } from '../../domain/repositories/IStudentReadRepository';

export class StudentReadRepository implements IStudentReadRepository {
  findById(_studentId: string): Promise<StudentReadModel | null> {
    throw new NotImplementedError();
  }

  search(_criteria: StudentSearchCriteria): Promise<StudentReadModel[]> {
    throw new NotImplementedError();
  }
}
