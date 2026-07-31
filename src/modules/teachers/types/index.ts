export interface TeacherEntity {
  id: string;
  name: string;
  nationalId: string;
  email: string;
  phone: string;
  specialization: string;
  hireDate: string;
  salary: number;
  status: 'active' | 'on-leave' | 'inactive';
  assignedClasses: string[];
  photo?: string;
}

export interface TeacherFilter {
  searchQuery?: string;
  specialization?: string;
  status?: string;
}
