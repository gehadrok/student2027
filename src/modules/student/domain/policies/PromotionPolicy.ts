import { Student } from '../aggregates/Student';

export interface PromotionPolicy {
  canPromote(student: Student): Promise<boolean>;
}
