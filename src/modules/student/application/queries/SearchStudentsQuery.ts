export interface SearchStudentsQuery {
  query?: string;
  status?: string;
  classId?: string;
  sectionId?: string;
  page?: number;
  pageSize?: number;
}
