import { Student } from '../aggregates/Student';

export interface GraduationPolicy {
  canGraduate(student: Student): Promise<boolean>;
}
