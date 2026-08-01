export interface RegisterStudentCommand {
  studentNumber: string;
  fullName: string;
  nationalId?: string;
  birthDate?: string;
  primaryGuardianId?: string;
}
