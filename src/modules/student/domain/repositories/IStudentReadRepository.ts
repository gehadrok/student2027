export interface StudentSearchCriteria {
  query?: string;
  status?: string;
  classId?: string;
  sectionId?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentReadModel {
  id: string;
  studentNumber: string;
  displayName: string;
  status: string;
  currentEnrollmentId?: string;
  primaryGuardianName?: string;
}

export interface IStudentReadRepository {
  findById(studentId: string): Promise<StudentReadModel | null>;
  search(criteria: StudentSearchCriteria): Promise<StudentReadModel[]>;
}
