export interface StudentEntity {
  id: string;
  name: string;
  nationalId: string;
  classId: string;
  className?: string;
  guardianName: string;
  phone: string;
  address: string;
  birthDate: string;
  gender: 'male' | 'female';
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'suspended' | 'transferred' | 'at-risk';
  healthNotes?: string;
  photo?: string;
  rfidCardId?: string;
}

export interface StudentFilter {
  searchQuery?: string;
  classId?: string;
  status?: string;
}
