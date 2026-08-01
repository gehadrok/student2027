import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';
import { StudentDto } from '../dto/StudentDto';
import { GetStudentByIdQuery, GetStudentHistoryQuery, SearchStudentsQuery } from '../queries';

export class StudentQueryService {
  getById(_query: GetStudentByIdQuery): Promise<StudentDto | null> {
    throw new NotImplementedError();
  }

  search(_query: SearchStudentsQuery): Promise<StudentDto[]> {
    throw new NotImplementedError();
  }

  getHistory(_query: GetStudentHistoryQuery): Promise<unknown[]> {
    throw new NotImplementedError();
  }
}
