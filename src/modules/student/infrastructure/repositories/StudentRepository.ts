import { Student } from '../../domain/aggregates/Student';
import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';
import { IStudentRepository } from '../../domain/repositories/IStudentRepository';

export class StudentRepository implements IStudentRepository {
  findById(_studentId: string): Promise<Student | null> {
    throw new NotImplementedError();
  }

  findByStudentNumber(_studentNumber: string): Promise<Student | null> {
    throw new NotImplementedError();
  }

  save(_student: Student, _expectedVersion: number): Promise<void> {
    throw new NotImplementedError();
  }

  exists(_studentId: string): Promise<boolean> {
    throw new NotImplementedError();
  }
}
