export interface StudentDto {
  id: string;
  studentNumber: string;
  displayName: string;
  status: string;
  currentEnrollmentId?: string;
  primaryGuardianId?: string;
}
