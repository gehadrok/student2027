import { Student } from '../aggregates/Student';

export interface TransferPolicy {
  canTransfer(student: Student): Promise<boolean>;
}
