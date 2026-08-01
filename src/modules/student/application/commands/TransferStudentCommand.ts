export interface TransferStudentCommand {
  studentId: string;
  transferId: string;
  targetEnrollmentId: string;
  reason: string;
}
