import { Student } from '../aggregates/Student';

export interface AdmissionPolicy {
  canAdmit(student: Student): Promise<boolean>;
}
