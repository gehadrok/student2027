import { Enrollment } from '../entities/Enrollment';

export interface IEnrollmentRepository {
  findById(enrollmentId: string): Promise<Enrollment | null>;
  findCurrentByStudentId(studentId: string): Promise<Enrollment | null>;
}
