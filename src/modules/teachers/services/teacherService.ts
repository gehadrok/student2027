import { teacherRepository } from '../repository/teacherRepository';
import { Teacher } from '../../../types';
import { TeacherFilter } from '../types';

export class TeacherService {
  getFilteredTeachers(filter: TeacherFilter): Teacher[] {
    let teachers = teacherRepository.getAll();

    if (filter.status && filter.status !== 'all') {
      teachers = teachers.filter((t) => t.status === filter.status);
    }

    if (filter.specialization && filter.specialization !== 'all') {
      teachers = teachers.filter((t) => t.specialization.includes(filter.specialization!));
    }

    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const q = filter.searchQuery.toLowerCase().trim();
      teachers = teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.specialization.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          t.email.toLowerCase().includes(q)
      );
    }

    return teachers;
  }

  addTeacher(teacherData: Omit<Teacher, 'id' | 'userId'>): Teacher {
    const newTeacher: Teacher = {
      ...teacherData,
      id: 't_' + Date.now().toString(36),
      userId: 'u_tch_' + Date.now().toString(36)
    };
    return teacherRepository.save(newTeacher);
  }

  updateTeacher(id: string, updateData: Partial<Teacher>): Teacher | undefined {
    const existing = teacherRepository.getById(id);
    if (!existing) return undefined;

    const updated: Teacher = {
      ...existing,
      ...updateData
    };
    return teacherRepository.save(updated);
  }

  deleteTeacher(id: string): boolean {
    return teacherRepository.delete(id);
  }
}

export const teacherService = new TeacherService();
