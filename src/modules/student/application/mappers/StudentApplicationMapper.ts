import { Student } from '../../domain/aggregates/Student';
import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';
import { StudentDto } from '../dto/StudentDto';

export class StudentApplicationMapper {
  toDto(_student: Student): StudentDto {
    throw new NotImplementedError();
  }
}
