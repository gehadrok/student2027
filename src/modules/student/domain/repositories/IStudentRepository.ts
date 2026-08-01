import { Student } from '../aggregates/Student';

export interface IStudentRepository {
  findById(studentId: string): Promise<Student | null>;
  findByStudentNumber(studentNumber: string): Promise<Student | null>;
  save(student: Student, expectedVersion: number): Promise<void>;
  exists(studentId: string): Promise<boolean>;
}
