export interface StudentProjection {
  studentId: string;
  studentNumber: string;
  displayName: string;
  status: string;
  currentEnrollmentId?: string;
  updatedAt?: Date;
}
