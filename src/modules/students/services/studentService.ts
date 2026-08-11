import { studentRepository } from '../repository/studentRepository';
import { Student } from '../../../types';
import { StudentFilter } from '../types';

export class StudentService {
  async getFilteredStudents(filter: StudentFilter): Promise<Student[]> {
    let students = await studentRepository.getAll();

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

  async addStudent(studentData: Omit<Student, 'id' | 'userId'>): Promise<Student> {
    const newStudent: Student = {
      ...studentData,
      id: 's_' + Date.now().toString(36),
      userId: 'u_' + Date.now().toString(36)
    };
    return studentRepository.save(newStudent);
  }

  async updateStudent(id: string, updateData: Partial<Student>): Promise<Student | undefined> {
    const existing = await studentRepository.getById(id);
    if (!existing) return undefined;

    const updated: Student = {
      ...existing,
      ...updateData
    };
    return studentRepository.save(updated);
  }

  async deleteStudent(id: string): Promise<boolean> {
    return studentRepository.delete(id);
  }
}

export const studentService = new StudentService();
