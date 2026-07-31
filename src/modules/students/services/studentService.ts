import { studentRepository } from '../repository/studentRepository';
import { Student } from '../../../types';
import { StudentFilter } from '../types';

export class StudentService {
  getFilteredStudents(filter: StudentFilter): Student[] {
    let students = studentRepository.getAll();

    if (filter.classId && filter.classId !== 'all') {
      students = students.filter((s) => s.classId === filter.classId);
    }

    if (filter.status && filter.status !== 'all') {
      students = students.filter((s) => s.status === filter.status);
    }

    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const q = filter.searchQuery.toLowerCase().trim();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.academicId.toLowerCase().includes(q) ||
          s.parentName.toLowerCase().includes(q) ||
          s.parentPhone.includes(q)
      );
    }

    return students;
  }

  addStudent(studentData: Omit<Student, 'id' | 'userId'>): Student {
    const newStudent: Student = {
      ...studentData,
      id: 's_' + Date.now().toString(36),
      userId: 'u_' + Date.now().toString(36)
    };
    return studentRepository.save(newStudent);
  }

  updateStudent(id: string, updateData: Partial<Student>): Student | undefined {
    const existing = studentRepository.getById(id);
    if (!existing) return undefined;

    const updated: Student = {
      ...existing,
      ...updateData
    };
    return studentRepository.save(updated);
  }

  deleteStudent(id: string): boolean {
    return studentRepository.delete(id);
  }
}

export const studentService = new StudentService();
