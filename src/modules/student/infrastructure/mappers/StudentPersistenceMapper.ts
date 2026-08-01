import { Student } from '../../domain/aggregates/Student';
import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';

export class StudentPersistenceMapper {
  toDomain(_record: unknown): Student {
    throw new NotImplementedError();
  }

  toPersistence(_student: Student): unknown {
    throw new NotImplementedError();
  }
}
