import { GuardianLink } from '../entities/GuardianLink';

export interface IGuardianRepository {
  findPrimaryByStudentId(studentId: string): Promise<GuardianLink | null>;
  findLinksByStudentId(studentId: string): Promise<GuardianLink[]>;
}
